import type { City } from "../services/cityApi"

const STORAGE_KEY = "carbutarn:recent-searches"
const MAX_RECENT = 5

export type RecentSearch =
  | {
      type: "city"
      id: string
      label: string
      subtitle: string
      city: City
    }
  | {
      type: "brand"
      id: string
      label: string
      subtitle: string
      brand: string
    }
  | {
      type: "station"
      id: string
      label: string
      subtitle: string
      stationId: string
    }

function isRecentSearch(value: unknown): value is RecentSearch {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  if (typeof entry.id !== "string" || typeof entry.label !== "string") {
    return false
  }
  if (entry.type === "city") {
    return typeof entry.city === "object" && entry.city !== null
  }
  if (entry.type === "brand") {
    return typeof entry.brand === "string"
  }
  if (entry.type === "station") {
    return typeof entry.stationId === "string"
  }
  return false
}

export function loadRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecentSearch).slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function saveRecentSearches(entries: RecentSearch[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_RECENT)),
    )
  } catch {
    // Quota / mode privé : on ignore
  }
}

/** Ajoute une recherche en tête (dédupliquée, max 5). */
export function pushRecentSearch(
  current: RecentSearch[],
  entry: RecentSearch,
): RecentSearch[] {
  const next = [
    entry,
    ...current.filter((item) => item.id !== entry.id),
  ].slice(0, MAX_RECENT)
  saveRecentSearches(next)
  return next
}

export function recentFromCity(city: City): RecentSearch {
  return {
    type: "city",
    id: `city:${city.name}:${city.postalCodes.join(",")}`,
    label: city.name,
    subtitle: city.postalCodes.join(", "),
    city,
  }
}

export function recentFromBrand(brand: string, count: number): RecentSearch {
  return {
    type: "brand",
    id: `brand:${brand}`,
    label: brand,
    subtitle: `${count} station${count > 1 ? "s" : ""}`,
    brand,
  }
}

export function recentFromStation(station: {
  id: string
  name: string
  brand: string | null
  address: string
  city: string
  postalCode: string
}): RecentSearch {
  const subtitle = [station.address, station.postalCode, station.city]
    .filter(Boolean)
    .join(" · ")

  return {
    type: "station",
    id: `station:${station.id}`,
    label: station.brand || station.name,
    subtitle,
    stationId: station.id,
  }
}
