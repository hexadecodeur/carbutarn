import { Hono } from "hono"
import { setCookie, deleteCookie } from "hono/cookie"
import {
  SESSION_COOKIE,
  consumeMagicLink,
  createSessionToken,
  requestMagicLink,
  sessionCookieOptions,
} from "../lib/auth"
import type { AppEnv } from "../types"

export const authRoutes = new Hono<AppEnv>()

authRoutes.post("/magic-link", async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email : ""

  try {
    await requestMagicLink(email)
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN"
    if (message === "INVALID_EMAIL") {
      return c.json({ error: "Adresse e-mail invalide" }, 400)
    }
    if (message === "EMAIL_SEND_FAILED") {
      return c.json({ error: "Impossible d’envoyer l’e-mail" }, 502)
    }
    throw error
  }

  // Toujours 200 pour ne pas révéler si l’e-mail existe
  return c.json({ ok: true })
})

authRoutes.get("/verify", async (c) => {
  const token = c.req.query("token")
  const appUrl = (process.env.APP_URL ?? "http://localhost:5173").replace(
    /\/$/,
    "",
  )

  if (!token) {
    return c.redirect(`${appUrl}/#connexion-erreur`)
  }

  try {
    const session = await consumeMagicLink(token)
    const jwt = await createSessionToken(session)
    setCookie(c, SESSION_COOKIE, jwt, sessionCookieOptions())
    return c.redirect(`${appUrl}/#connexion-ok`)
  } catch {
    return c.redirect(`${appUrl}/#connexion-erreur`)
  }
})

authRoutes.get("/me", (c) => {
  const userId = c.get("userId")
  const email = c.get("userEmail")
  if (!userId || !email) {
    return c.json({ user: null }, 401)
  }
  return c.json({ user: { id: userId, email } })
})

authRoutes.post("/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" })
  return c.json({ ok: true })
})
