import { createHash, randomBytes, randomUUID } from "node:crypto"
import { SignJWT, jwtVerify } from "jose"
import { eq, and, isNull, gt } from "drizzle-orm"
import { Resend } from "resend"
import { getDb } from "../db/client"
import { magicLinkTokens, reports, users } from "../db/schema"
import { assertMagicLinkAllowed } from "./rateLimit"
import { isProductionRuntime } from "./turnstile"

export const SESSION_COOKIE = "carbutarn_session"

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 jours
const MAGIC_LINK_TTL_MS = 1000 * 60 * 15 // 15 min
const MIN_SECRET_LENGTH = 32

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

function requireStrongSecret(name: string): string {
  const value = requireEnv(name).trim()
  if (isProductionRuntime()) {
    if (value.length < MIN_SECRET_LENGTH || value.startsWith("change-me")) {
      throw new Error(`${name}_WEAK`)
    }
  } else if (value.length < 8) {
    throw new Error(`${name}_WEAK`)
  }
  return value
}

function sessionSecretKey() {
  return new TextEncoder().encode(requireStrongSecret("SESSION_SECRET"))
}

function magicLinkPepper(): string {
  return requireStrongSecret("MAGIC_LINK_SECRET")
}

export type SessionPayload = {
  userId: string
  email: string
  sessionVersion: number
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const appUrl = requireEnv("APP_URL").replace(/\/$/, "")
  return new SignJWT({
    email: payload.email,
    sv: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(appUrl)
    .setAudience(appUrl)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecretKey())
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    if (!token || token.length > 4096) return null

    const appUrl = requireEnv("APP_URL").replace(/\/$/, "")
    const { payload } = await jwtVerify(token, sessionSecretKey(), {
      issuer: appUrl,
      audience: appUrl,
    })
    const userId = payload.sub
    const email = payload.email
    // jose/JSON : sv doit être un nombre ; tolérer string numérique (anciennes émissions)
    const sessionVersion = Number(payload.sv)
    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      !Number.isFinite(sessionVersion)
    ) {
      return null
    }

    const db = getDb()
    const [user] = await db
      .select({ sessionVersion: users.sessionVersion })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) return null
    if (Number(user.sessionVersion) !== sessionVersion) return null

    return { userId, email, sessionVersion }
  } catch {
    // Expiré, signature invalide, secret manquant, DB down, etc. → pas de session
    return null
  }
}

function hashToken(raw: string): string {
  return createHash("sha256")
    .update(`${magicLinkPepper()}:${raw}`)
    .digest("hex")
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error("INVALID_EMAIL")
  }
  return normalized
}

export async function requestMagicLink(
  email: string,
  ipHash: string,
): Promise<void> {
  const normalized = normalizeEmail(email)

  await assertMagicLinkAllowed({ email: normalized, ipHash })

  const db = getDb()
  const now = new Date()

  // Invalide les liens non consommés du même e-mail
  await db
    .update(magicLinkTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(magicLinkTokens.email, normalized),
        isNull(magicLinkTokens.consumedAt),
      ),
    )

  const rawToken = randomBytes(32).toString("base64url")
  const tokenHash = hashToken(rawToken)

  await db.insert(magicLinkTokens).values({
    id: randomUUID(),
    email: normalized,
    tokenHash,
    ipHash,
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
  })

  const appUrl = requireEnv("APP_URL").replace(/\/$/, "")
  // Token uniquement dans le fragment → jamais dans les logs d’accès serveur
  const verifyUrl = `${appUrl}/#connexion-token=${encodeURIComponent(rawToken)}`

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from =
    process.env.EMAIL_FROM?.trim() || "CarbuTarn <onboarding@resend.dev>"

  if (!apiKey) {
    if (isProductionRuntime()) {
      console.error("[magic-link] RESEND_API_KEY missing in production")
      throw new Error("EMAIL_SEND_FAILED")
    }
    // Dev : indiquer où trouver le lien sans logger le token
    console.info(
      "[magic-link] RESEND_API_KEY missing — ouvre le fragment #connexion-token=… (token non loggé). E-mail:",
      normalized,
    )
    // En local uniquement : exposer via variable pour tests manuels
    if (process.env.MAGIC_LINK_DEV_LOG === "1") {
      console.info("[magic-link:dev]", verifyUrl)
    }
    return
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: normalized,
    subject: "Connexion CarbuTarn",
    text: `Voici ton lien de connexion CarbuTarn (valable 15 minutes) :\n\n${verifyUrl}\n\nSi tu n’as pas demandé ce lien, ignore cet e-mail.`,
    html: `<p>Voici ton lien de connexion CarbuTarn (valable 15 minutes) :</p><p><a href="${verifyUrl}">Se connecter</a></p><p>Si tu n’as pas demandé ce lien, ignore cet e-mail.</p>`,
  })

  if (error) {
    console.error("[magic-link] Resend error:", error.message ?? "send failed")
    throw new Error("EMAIL_SEND_FAILED")
  }
}

/** Consume atomique : UPDATE … WHERE consumed_at IS NULL RETURNING. */
export async function consumeMagicLink(
  rawToken: string,
): Promise<SessionPayload> {
  if (!rawToken || rawToken.length > 128) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN")
  }

  const db = getDb()
  const tokenHash = hashToken(rawToken)
  const now = new Date()

  const consumed = await db
    .update(magicLinkTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        isNull(magicLinkTokens.consumedAt),
        gt(magicLinkTokens.expiresAt, now),
      ),
    )
    .returning()

  const row = consumed[0]
  if (!row) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN")
  }

  const email = row.email
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  let userId: string
  let sessionVersion: number
  if (existing[0]) {
    userId = existing[0].id
    sessionVersion = existing[0].sessionVersion
  } else {
    userId = randomUUID()
    sessionVersion = 0
    await db.insert(users).values({ id: userId, email, sessionVersion })
  }

  return { userId, email, sessionVersion }
}

export async function bumpSessionVersion(userId: string): Promise<void> {
  const db = getDb()
  const [user] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!user) return

  await db
    .update(users)
    .set({ sessionVersion: user.sessionVersion + 1 })
    .where(eq(users.id, userId))
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const db = getDb()

  await db.delete(reports).where(eq(reports.userId, userId))

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (user) {
    await db
      .delete(magicLinkTokens)
      .where(eq(magicLinkTokens.email, user.email))
  }

  await db.delete(users).where(eq(users.id, userId))
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  const secure = (process.env.APP_URL ?? "").startsWith("https")
  return {
    httpOnly: true,
    secure,
    sameSite: "Lax" as const,
    path: "/",
    maxAge,
  }
}
