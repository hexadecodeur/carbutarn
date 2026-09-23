/**
 * Config tuiles carte — MapTiler si MAPTILER_API_KEY est défini,
 * sinon fallback OSM (dev uniquement ; stores = MapTiler requis).
 */

export type MapTilesConfig = {
  tileUrl: string
  attribution: string
  provider: "maptiler" | "osm"
}

const OSM_FALLBACK: MapTilesConfig = {
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
  provider: "osm",
}

const MAPTILER_ATTR = "© MapTiler © OpenStreetMap contributors"

export function getMapTilesConfig(): MapTilesConfig {
  const key = process.env.MAPTILER_API_KEY?.trim()
  if (!key) return OSM_FALLBACK

  return {
    tileUrl: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
    attribution: MAPTILER_ATTR,
    provider: "maptiler",
  }
}
