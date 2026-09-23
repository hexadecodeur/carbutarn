import { timingSafeEqual } from "node:crypto"

/** Compare deux chaînes en temps constant (même longueur requise côté buffers). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Valide `Authorization: Bearer <secret>`. */
export function bearerMatches(authHeader: string | undefined, secret: string): boolean {
  if (!authHeader || !secret) return false
  const prefix = "Bearer "
  if (!authHeader.startsWith(prefix)) return false
  const token = authHeader.slice(prefix.length)
  return timingSafeEqualString(token, secret)
}
