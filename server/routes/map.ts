import { Hono } from "hono"
import { getMapTilesConfig } from "../lib/mapTiles"
import type { AppEnv } from "../types"

export const mapRoutes = new Hono<AppEnv>()

/** Config publique des tuiles (la clé MapTiler est bornée par hostname chez MapTiler). */
mapRoutes.get("/tiles", (c) => {
  const config = getMapTilesConfig()
  c.header("Cache-Control", "public, max-age=300")
  return c.json(config)
})
