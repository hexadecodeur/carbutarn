import type { Station } from "../types/station"

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

function compactSearch(text: string): string {
  return normalizeSearch(text).replace(/[^a-z0-9]/g, "")
}

function textMatches(haystack: string, query: string): boolean {
  const h = normalizeSearch(haystack)
  const q = normalizeSearch(query)
  if (!q) return false
  if (h.includes(q)) return true

  const hc = compactSearch(haystack)
  const qc = compactSearch(query)
  return qc.length >= 2 && hc.includes(qc)
}

export type BrandMatch = {
  brand: string
  count: number
  stations: Station[]
}

function stationBrandLabel(station: Station): string | null {
  const brand = station.brand?.trim()
  if (brand) return brand
  // Si l’enseigne OSM est déjà dans name (enrichissement partiel)
  const name = station.name?.trim()
  if (!name) return null
  // Évite de traiter une adresse Open Data comme enseigne
  if (name.includes(",") || /^\d/.test(name)) return null
  if (/^(route|rue|avenue|chemin|boulevard|lieu)/i.test(name)) return null
  return name
}

/** Même enseigne malgré « E.Leclerc » / « E. Leclerc ». */
export function stationMatchesBrand(
  station: Station,
  brand: string,
): boolean {
  const label = stationBrandLabel(station)
  if (!label) return false
  return compactSearch(label) === compactSearch(brand)
}

/** Enseignes uniques dont le nom matche la requête. */
export function searchBrands(
  stations: Station[],
  query: string,
  limit = 6,
): BrandMatch[] {
  const q = normalizeSearch(query)
  if (q.length < 2) return []

  const byKey = new Map<
    string,
    { label: string; labelCount: Map<string, number>; stations: Station[] }
  >()

  for (const station of stations) {
    const brand = stationBrandLabel(station)
    if (!brand) continue
    if (!textMatches(brand, q)) continue

    const key = compactSearch(brand)
    const entry = byKey.get(key) ?? {
      label: brand,
      labelCount: new Map<string, number>(),
      stations: [],
    }
    entry.stations.push(station)
    entry.labelCount.set(brand, (entry.labelCount.get(brand) ?? 0) + 1)
    // Garde le libellé le plus fréquent (ex. E.Leclerc vs E. Leclerc)
    let bestLabel = entry.label
    let bestCount = entry.labelCount.get(bestLabel) ?? 0
    for (const [label, count] of entry.labelCount) {
      if (count > bestCount) {
        bestLabel = label
        bestCount = count
      }
    }
    entry.label = bestLabel
    byKey.set(key, entry)
  }

  return [...byKey.values()]
    .map((entry) => ({
      brand: entry.label,
      count: entry.stations.length,
      stations: entry.stations,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.brand.localeCompare(b.brand, "fr"),
    )
    .slice(0, limit)
}

/** Stations dont enseigne, nom, ville ou adresse matche. */
export function searchStations(
  stations: Station[],
  query: string,
  limit = 8,
): Station[] {
  const q = normalizeSearch(query)
  if (q.length < 2) return []

  const scored: { station: Station; score: number }[] = []

  for (const station of stations) {
    const brand = station.brand ?? ""
    const name = station.name
    const city = station.city
    const address = station.address

    let score = 0
    if (brand && textMatches(brand, q)) {
      score = compactSearch(brand).startsWith(compactSearch(q)) ? 3 : 2
    } else if (textMatches(name, q)) score = 2
    else if (textMatches(city, q) || textMatches(address, q)) score = 1

    if (score === 0) continue

    scored.push({ station, score })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.station)
}
