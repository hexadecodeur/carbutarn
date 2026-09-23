import { createHash } from "node:crypto"
import { and, eq, gte, sql } from "drizzle-orm"
import { getDb } from "../db/client"
import { magicLinkTokens } from "../db/schema"

export const MAGIC_LINK_PER_EMAIL = 3
export const MAGIC_LINK_EMAIL_WINDOW_MS = 15 * 60 * 1000
export const MAGIC_LINK_PER_IP = 10
export const MAGIC_LINK_IP_WINDOW_MS = 60 * 60 * 1000

function hashIp(ip: string): string {
  const pepper = process.env.MAGIC_LINK_SECRET ?? "ip"
  return createHash("sha256").update(`${pepper}:ip:${ip}`).digest("hex")
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  return headers.get("x-real-ip")?.trim().slice(0, 64) || "unknown"
}

export function hashClientIp(ip: string): string {
  return hashIp(ip)
}

/** Compte les demandes magic-link récentes (e-mail + IP). */
export async function assertMagicLinkAllowed(options: {
  email: string
  ipHash: string
}): Promise<void> {
  const db = getDb()
  const emailSince = new Date(Date.now() - MAGIC_LINK_EMAIL_WINDOW_MS)
  const ipSince = new Date(Date.now() - MAGIC_LINK_IP_WINDOW_MS)

  const [emailCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.email, options.email),
        gte(magicLinkTokens.createdAt, emailSince),
      ),
    )

  if ((emailCount?.count ?? 0) >= MAGIC_LINK_PER_EMAIL) {
    throw new Error("RATE_LIMITED")
  }

  const [ipCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.ipHash, options.ipHash),
        gte(magicLinkTokens.createdAt, ipSince),
      ),
    )

  if ((ipCount?.count ?? 0) >= MAGIC_LINK_PER_IP) {
    throw new Error("RATE_LIMITED")
  }
}
