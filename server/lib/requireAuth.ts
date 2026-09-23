import type { Context, Next } from "hono"
import { deleteCookie, getCookie } from "hono/cookie"
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  verifySessionToken,
} from "./auth"
import type { AppEnv } from "../types"

export type AuthedUser = { userId: string; email: string }

/**
 * Attache la session si le cookie est valide.
 * Cookie présent mais invalide/expiré → efface le cookie + sessionInvalid
 * (les routes protégées répondent 401 ; /prices continue en anonyme).
 */
export async function attachSession(c: Context<AppEnv>, next: Next) {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) {
    await next()
    return
  }

  try {
    const session = await verifySessionToken(token)
    if (session) {
      c.set("userId", session.userId)
      c.set("userEmail", session.email)
    } else {
      deleteCookie(c, SESSION_COOKIE, sessionCookieOptions(0))
      c.set("sessionInvalid", true)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    console.error("[auth] attachSession", message)
    deleteCookie(c, SESSION_COOKIE, sessionCookieOptions(0))
    c.set("sessionInvalid", true)
  }

  await next()
}

/** 401 si cookie de session présent mais invalide. */
export function rejectInvalidSession(c: Context<AppEnv>) {
  if (!c.get("sessionInvalid")) return null
  return c.json({ error: "Session expirée ou invalide" }, 401)
}

/**
 * Exige un utilisateur authentifié.
 * Retourne les infos user, ou `null` si le caller doit renvoyer
 * la Response déjà produite via `authError(c)`.
 */
export function getAuthedUser(c: Context<AppEnv>): AuthedUser | null {
  if (c.get("sessionInvalid")) return null
  const userId = c.get("userId")
  const email = c.get("userEmail")
  if (!userId || !email) return null
  return { userId, email }
}

export function authError(c: Context<AppEnv>) {
  if (c.get("sessionInvalid")) {
    return c.json({ error: "Session expirée ou invalide" }, 401)
  }
  return c.json({ error: "Authentification requise" }, 401)
}
