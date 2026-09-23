export type MapTilesConfig = {
  tileUrl: string
  attribution: string
  provider: "maptiler" | "osm"
}

const FALLBACK: MapTilesConfig = {
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
  provider: "osm",
}

/** Tuiles via `/api/map/tiles` (MAPTILER_API_KEY côté serveur, pas de VITE_). */
export async function fetchMapTilesConfig(): Promise<MapTilesConfig> {
  try {
    const response = await fetch("/api/map/tiles")
    if (!response.ok) return FALLBACK
    const data = (await response.json()) as Partial<MapTilesConfig>
    if (typeof data.tileUrl !== "string" || !data.tileUrl.includes("{z}")) {
      return FALLBACK
    }
    return {
      tileUrl: data.tileUrl,
      attribution:
        typeof data.attribution === "string"
          ? data.attribution
          : FALLBACK.attribution,
      provider: data.provider === "maptiler" ? "maptiler" : "osm",
    }
  } catch {
    return FALLBACK
  }
}
