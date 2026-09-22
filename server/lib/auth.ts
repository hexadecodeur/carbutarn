import { createHash, randomBytes, randomUUID } from "node:crypto"
import { SignJWT, jwtVerify } from "jose"
import { eq, and, isNull, gt } from "drizzle-orm"
import { Resend } from "resend"
import { getDb } from "../db/client"
import { magicLinkTokens, users } from "../db/schema"

export const SESSION_COOKIE = "carbutarn_session"

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 jours
const MAGIC_LINK_TTL_MS = 1000 * 60 * 15 // 15 min

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

function sessionSecretKey() {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"))
}

export type SessionPayload = {
  userId: string
  email: string
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecretKey())
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey())
    const userId = payload.sub
    const email = payload.email
    if (typeof userId !== "string" || typeof email !== "string") return null
    return { userId, email }
  } catch {
    return null
  }
}

function hashToken(raw: string): string {
  const pepper = process.env.MAGIC_LINK_SECRET ?? ""
  return createHash("sha256").update(`${pepper}:${raw}`).digest("hex")
}

export async function requestMagicLink(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("INVALID_EMAIL")
  }

  const db = getDb()
  const rawToken = randomBytes(32).toString("base64url")
  const tokenHash = hashToken(rawToken)

  await db.insert(magicLinkTokens).values({
    id: randomUUID(),
    email: normalized,
    tokenHash,
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
  })

  const appUrl = requireEnv("APP_URL").replace(/\/$/, "")
  const verifyUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(rawToken)}`

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim() || "CarbuTarn <onboarding@resend.dev>"

  if (!apiKey) {
    // Dev sans Resend : log le lien (ne jamais faire ça en prod)
    console.info("[magic-link] RESEND_API_KEY missing — link:", verifyUrl)
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
    console.error("[magic-link] Resend error:", error)
    throw new Error("EMAIL_SEND_FAILED")
  }
}

export async function consumeMagicLink(
  rawToken: string,
): Promise<SessionPayload> {
  const db = getDb()
  const tokenHash = hashToken(rawToken)
  const now = new Date()

  const [row] = await db
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        isNull(magicLinkTokens.consumedAt),
        gt(magicLinkTokens.expiresAt, now),
      ),
    )
    .limit(1)

  if (!row) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN")
  }

  await db
    .update(magicLinkTokens)
    .set({ consumedAt: now })
    .where(eq(magicLinkTokens.id, row.id))

  const email = row.email
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  let userId: string
  if (existing[0]) {
    userId = existing[0].id
  } else {
    userId = randomUUID()
    await db.insert(users).values({ id: userId, email })
  }

  return { userId, email }
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
