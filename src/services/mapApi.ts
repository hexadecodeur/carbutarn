export type MapTilesConfig = {
  tileUrl: string
  attribution: string
  provider: "maptiler" | "carto"
}

const FALLBACK: MapTilesConfig = {
  tileUrl:
    "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap © CARTO",
  provider: "carto",
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
      provider: data.provider === "maptiler" ? "maptiler" : "carto",
    }
  } catch {
    return FALLBACK
  }
}
