import { Hono } from "hono"
import { setCookie, deleteCookie } from "hono/cookie"
import {
  SESSION_COOKIE,
  bumpSessionVersion,
  consumeMagicLink,
  createSessionToken,
  deleteUserAccount,
  requestMagicLink,
  sessionCookieOptions,
} from "../lib/auth"
import { clientIp, hashClientIp } from "../lib/rateLimit"
import { authError, getAuthedUser, rejectInvalidSession } from "../lib/requireAuth"
import { verifyTurnstile } from "../lib/turnstile"
import type { AppEnv } from "../types"

export const authRoutes = new Hono<AppEnv>()

/** Site key publique Turnstile (pas de préfixe VITE_ — Vercel la refuse). */
authRoutes.get("/turnstile", (c) => {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || null
  return c.json({ siteKey })
})

authRoutes.post("/magic-link", async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email : ""
  const turnstileToken =
    typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined

  const ip = clientIp(c.req.raw.headers)

  try {
    await verifyTurnstile(turnstileToken, ip)
    await requestMagicLink(email, hashClientIp(ip))
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN"
    if (message === "INVALID_EMAIL") {
      return c.json({ error: "Adresse e-mail invalide" }, 400)
    }
    if (message === "RATE_LIMITED") {
      return c.json(
        { error: "Trop de demandes. Réessaie dans quelques minutes." },
        429,
      )
    }
    if (message === "CAPTCHA_REQUIRED" || message === "CAPTCHA_FAILED") {
      return c.json({ error: "Vérification anti-robot requise" }, 400)
    }
    if (message === "EMAIL_SEND_FAILED") {
      return c.json({ error: "Impossible d’envoyer l’e-mail" }, 502)
    }
    if (message === "MAGIC_LINK_SECRET_WEAK" || message === "SESSION_SECRET_WEAK") {
      console.error("[auth] weak secret:", message)
      return c.json({ error: "Configuration serveur invalide" }, 500)
    }
    throw error
  }

  return c.json({ ok: true })
})

/**
 * Anciens e-mails GET ?token= → redirigent vers le fragment (sans consommer).
 * La consommation se fait uniquement via POST /verify.
 */
authRoutes.get("/verify", (c) => {
  const token = c.req.query("token")
  const appUrl = (process.env.APP_URL ?? "http://localhost:5173").replace(
    /\/$/,
    "",
  )

  if (!token) {
    return c.redirect(`${appUrl}/#connexion-erreur`)
  }

  return c.redirect(
    `${appUrl}/#connexion-token=${encodeURIComponent(token)}`,
  )
})

authRoutes.post("/verify", async (c) => {
  const body = await c.req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token : ""

  if (!token) {
    return c.json({ error: "Token manquant" }, 400)
  }

  try {
    const session = await consumeMagicLink(token)
    const jwt = await createSessionToken(session)
    setCookie(c, SESSION_COOKIE, jwt, sessionCookieOptions())
    return c.json({ ok: true, user: { id: session.userId, email: session.email } })
  } catch {
    return c.json({ error: "Lien invalide ou expiré" }, 400)
  }
})

authRoutes.get("/me", (c) => {
  const invalid = rejectInvalidSession(c)
  if (invalid) return invalid

  const userId = c.get("userId")
  const email = c.get("userEmail")
  // 200 + user:null = pas de cookie (évite un 401 « faux positif » en Network)
  if (!userId || !email) {
    return c.json({ user: null })
  }
  return c.json({ user: { id: userId, email } })
})

authRoutes.post("/logout", async (c) => {
  const userId = c.get("userId")
  if (userId) {
    try {
      await bumpSessionVersion(userId)
    } catch {
      console.error("[auth] logout bump failed")
    }
  }
  deleteCookie(c, SESSION_COOKIE, sessionCookieOptions(0))
  return c.json({ ok: true })
})

authRoutes.delete("/account", async (c) => {
  const authed = getAuthedUser(c)
  if (!authed) return authError(c)

  try {
    await deleteUserAccount(authed.userId)
  } catch {
    console.error("[auth] delete account failed")
    return c.json({ error: "Suppression impossible" }, 500)
  }

  deleteCookie(c, SESSION_COOKIE, sessionCookieOptions(0))
  return c.json({ ok: true })
})
