import { Hono } from "hono"
import { syncOfficialPrices } from "../lib/syncOfficial"
import { bearerMatches } from "../lib/secureCompare"
import type { AppEnv } from "../types"

export const cronRoutes = new Hono<AppEnv>()

cronRoutes.get("/sync-official", async (c) => {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || secret.length < 16 || secret.startsWith("change-me")) {
    console.error("[cron] CRON_SECRET manquant ou trop faible")
    return c.json({ error: "Unauthorized" }, 401)
  }

  // Seule frontière : Bearer CRON_SECRET (x-vercel-cron est spoofable).
  if (!bearerMatches(c.req.header("authorization"), secret)) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const result = await syncOfficialPrices()
  return c.json({ ok: true, ...result })
})
