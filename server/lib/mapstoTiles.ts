/**
 * Config tuiles carte — MapTiler si MAPTILER_API_KEY est défini,
 * sinon Carto (OSM.org tiles interdit en prod / souvent bloqué).
 */

export type MapTilesConfig = {
  tileUrl: string
  attribution: string
  provider: "maptiler" | "carto"
}

/** Fallback libre (raster) — ne pas utiliser tile.openstreetmap.org. */
const CARTO_FALLBACK: MapTilesConfig = {
  tileUrl:
    "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap © CARTO",
  provider: "carto",
}

const MAPTILER_ATTR = "© MapTiler © OpenStreetMap contributors"

export function getMapTilesConfig(): MapTilesConfig {
  const key = process.env.MAPTILER_API_KEY?.trim()
  if (!key) return CARTO_FALLBACK

  return {
    tileUrl: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
    attribution: MAPTILER_ATTR,
    provider: "maptiler",
  }
}
