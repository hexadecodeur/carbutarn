import type { Station } from "../types/station"
import { getStationDisplayName } from "../types/station"
import { getDistanceKm } from "../utils/distance"

const OVERPASS_ENDPOINTS = [
  // Endpoints publics EU / communautaires (éviter les miroirs hors UE en premier)
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

const FETCH_TIMEOUT_MS = 12_000
const CACHE_KEY = "carbutarn-osm-brands-v1"
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h
/** Snapshot local si Overpass est saturé (généré via scripts/fetch-osm-brands.mjs) */
const STATIC_BRANDS_URL = "/osm-brands-tarn.json"

/** Bounding box approximative du département du Tarn */
const TARN_BBOX = {
  south: 43.35,
  west: 1.5,
  north: 44.3,
  east: 2.85,
}

/**
 * Ne remplace les coords Open Data par OSM que si l’écart reste
 * raisonnable (évite un mauvais matching).
 */
const MAX_OSM_OFFSET_KM = 0.2

type OsmTags = {
  "ref:FR:prix-carburants"?: string
  brand?: string
  name?: string
  operator?: string
}

type OsmElement = {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: OsmTags
}

type OverpassResponse = {
  elements: OsmElement[]
}

export type StationOsmInfo = {
  brand: string | null
  name: string | null
  latitude: number | null
  longitude: number | null
}

type CachedBrands = {
  savedAt: number
  entries: [string, StationOsmInfo][]
}

function getOsmCoordinates(
  element: OsmElement,
): { latitude: number; longitude: number } | null {
  if (
    typeof element.lat === "number" &&
    typeof element.lon === "number"
  ) {
    return { latitude: element.lat, longitude: element.lon }
  }

  if (
    element.center &&
    typeof element.center.lat === "number" &&
    typeof element.center.lon === "number"
  ) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    }
  }

  return null
}

/** Préfère brand OSM, sinon name/operator (souvent « E.Leclerc » sans tag brand). */
function resolveBrand(tags: OsmTags | undefined): string | null {
  const brand = tags?.brand?.trim()
  if (brand) return brand

  const name = tags?.name?.trim()
  if (name) return name

  const operator = tags?.operator?.trim()
  if (operator) return operator

  return null
}

function parseOverpassElements(
  elements: OsmElement[],
): Map<string, StationOsmInfo> {
  const brands = new Map<string, StationOsmInfo>()

  for (const element of elements) {
    const ref = element.tags?.["ref:FR:prix-carburants"]?.trim()
    if (!ref) continue

    const brand = resolveBrand(element.tags)
    const name =
      element.tags?.name?.trim() ||
      element.tags?.operator?.trim() ||
      null
    const coords = getOsmCoordinates(element)

    brands.set(ref, {
      brand,
      name,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    })
  }

  return brands
}

function loadCachedBrands(): Map<string, StationOsmInfo> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedBrands
    if (!parsed?.savedAt || !Array.isArray(parsed.entries)) return null
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null
    return new Map(parsed.entries)
  } catch {
    return null
  }
}

function saveCachedBrands(brands: Map<string, StationOsmInfo>) {
  try {
    const payload: CachedBrands = {
      savedAt: Date.now(),
      entries: [...brands.entries()],
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // quota / private mode : ignore
  }
}

async function loadStaticBrands(): Promise<Map<string, StationOsmInfo> | null> {
  try {
    const response = await fetch(STATIC_BRANDS_URL)
    if (!response.ok) return null
    const data = (await response.json()) as Record<
      string,
      {
        brand?: string | null
        name?: string | null
        lat?: number | null
        lon?: number | null
      }
    >
    const brands = new Map<string, StationOsmInfo>()
    for (const [ref, info] of Object.entries(data)) {
      brands.set(ref, {
        brand: info.brand ?? info.name ?? null,
        name: info.name ?? null,
        latitude: info.lat ?? null,
        longitude: info.lon ?? null,
      })
    }
    return brands.size > 0 ? brands : null
  } catch {
    return null
  }
}

async function fetchFromEndpoint(
  endpoint: string,
  body: string,
): Promise<Map<string, StationOsmInfo>> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Overpass ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as OverpassResponse
  if (!Array.isArray(data.elements)) {
    throw new Error("Réponse Overpass invalide")
  }

  return parseOverpassElements(data.elements)
}

/**
 * Récupère enseignes + coordonnées OSM des stations du Tarn,
 * jointes via ref:FR:prix-carburants (= id Open Data).
 * Cache / snapshot d’abord. Overpass uniquement si VITE_OSM_OVERPASS=1
 * (désactivé par défaut en prod store — snapshot local suffit).
 */
export async function fetchStationBrands(
  onFresh?: (brands: Map<string, StationOsmInfo>) => void,
): Promise<Map<string, StationOsmInfo>> {
  const allowOverpass = import.meta.env.VITE_OSM_OVERPASS === "1"

  const cached = loadCachedBrands()
  if (cached && cached.size > 0) {
    if (allowOverpass) {
      void refreshBrandsFromOverpass()
        .then((fresh) => {
          if (fresh.size > 0) onFresh?.(fresh)
        })
        .catch(() => {
          /* déjà en cache */
        })
    }
    return cached
  }

  const staticBrands = await loadStaticBrands()
  if (staticBrands) {
    saveCachedBrands(staticBrands)
    if (allowOverpass) {
      void refreshBrandsFromOverpass()
        .then((fresh) => {
          if (fresh.size > 0) onFresh?.(fresh)
        })
        .catch(() => {
          /* snapshot suffit */
        })
    }
    return staticBrands
  }

  if (allowOverpass) {
    return refreshBrandsFromOverpass()
  }

  return new Map()
}

async function refreshBrandsFromOverpass(): Promise<
  Map<string, StationOsmInfo>
> {
  const { south, west, north, east } = TARN_BBOX

  const query = `
    [out:json][timeout:15];
    (
      nwr["amenity"="fuel"]["ref:FR:prix-carburants"](${south},${west},${north},${east});
    );
    out center tags;
  `
  const body = `data=${encodeURIComponent(query)}`
  const errors: string[] = []

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const brands = await fetchFromEndpoint(endpoint, body)
      if (brands.size > 0) {
        saveCachedBrands(brands)
        return brands
      }
      errors.push(`${endpoint}: réponse vide`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${endpoint}: ${message}`)
    }
  }

  throw new Error(`Enseignes OSM indisponibles (${errors.join(" · ")})`)
}

/** Applique enseignes + coords OSM (échec OSM = stations inchangées). */
export function enrichStationsWithBrands(
  stations: Station[],
  brands: Map<string, StationOsmInfo>,
): Station[] {
  return stations.map((station) => {
    const info = brands.get(station.id)
    if (!info) return station

    const brand = info.brand
    const osmName = info.name

    let latitude = station.latitude
    let longitude = station.longitude

    if (info.latitude !== null && info.longitude !== null) {
      const offsetKm = getDistanceKm(
        station.latitude,
        station.longitude,
        info.latitude,
        info.longitude,
      )

      // OSM est en général plus précis pour l’entrée de station
      if (offsetKm <= MAX_OSM_OFFSET_KM) {
        latitude = info.latitude
        longitude = info.longitude
      }
    }

    return {
      ...station,
      latitude,
      longitude,
      brand,
      name: getStationDisplayName({
        brand,
        name: osmName ?? "",
        address: station.address,
        city: station.city,
      }),
    }
  })
}
