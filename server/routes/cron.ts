import { Hono } from "hono"
import { syncOfficialPrices } from "../lib/syncOfficial"
import type { AppEnv } from "../types"

export const cronRoutes = new Hono<AppEnv>()

cronRoutes.get("/sync-official", async (c) => {
  const secret = process.env.CRON_SECRET
  const auth = c.req.header("authorization")
  const vercelCron = c.req.header("x-vercel-cron")

  const authorized =
    (secret && auth === `Bearer ${secret}`) ||
    // Vercel Cron envoie ce header en production
    Boolean(vercelCron)

  if (!authorized) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const result = await syncOfficialPrices()
  return c.json({ ok: true, ...result })
})
