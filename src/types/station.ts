export type FuelType = "Gazole" | "SP95" | "E10" | "SP98" | "E85" | "GPLc"

/** Carburants proposés dans les filtres liste / carte */
export type ListFuelType = "Gazole" | "E10" | "SP98" | "E85"

/** Critère de tri une fois un carburant choisi */
export type SortBy = "distance" | "price"

/** Ordre du tri par prix (recliquer sur Prix pour basculer) */
export type PriceSortOrder = "asc" | "desc"

export type FuelPrice = {
  type: FuelType
  price: number
  updatedAt: string | null
}

export type Station = {
  id: string

  latitude: number
  longitude: number

  /** Enseigne OSM (Total, Intermarché, …) si connue */
  brand: string | null
  /** Nom d’affichage : enseigne, name OSM, ou adresse + ville */
  name: string

  address: string
  city: string
  postalCode: string

  fuels: FuelPrice[]

  services: string[]
  openingHours: string | null
  /** Automate 24h/24 (champ API horaires_automate_24_24) */
  is24h: boolean

  distance?: number
}

export function getStationDisplayName(station: {
  brand: string | null
  name: string
  address: string
  city: string
}): string {
  if (station.brand) return station.brand
  if (station.name) return station.name
  if (station.address && station.address !== "Adresse inconnue") {
    return station.city
      ? `${station.address}, ${station.city}`
      : station.address
  }
  return station.city || "Station-service"
}

export function formatStationAddress(station: {
  address: string
  postalCode: string
  city: string
}): string {
  const parts: string[] = []

  if (station.address && station.address !== "Adresse inconnue") {
    parts.push(station.address)
  }

  const cityLine = [station.postalCode, station.city].filter(Boolean).join(" ")
  if (cityLine) parts.push(cityLine)

  return parts.join(" · ") || "Adresse inconnue"
}
