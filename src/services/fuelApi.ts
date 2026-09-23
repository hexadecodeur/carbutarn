import type { FuelPrice, FuelType, Station } from "../types/station"
import { getStationDisplayName } from "../types/station"

type ApiStation = {
  id: string
  latitude: number
  longitude: number
  brand: string | null
  name: string
  address: string
  city: string
  postalCode: string
  fuels: { type: FuelType; price: number; updatedAt: string | null }[]
  services: string[]
  openingHours: string | null
  is24h: boolean
}

function normalizeStation(station: ApiStation): Station {
  const brand = station.brand
  const address = station.address || "Adresse inconnue"
  const city = station.city || ""

  return {
    id: station.id,
    latitude: station.latitude,
    longitude: station.longitude,
    brand,
    name: getStationDisplayName({
      brand,
      name: station.name,
      address,
      city,
    }),
    address,
    city,
    postalCode: station.postalCode ?? "",
    fuels: station.fuels as FuelPrice[],
    services: station.services ?? [],
    openingHours: station.openingHours ?? null,
    is24h: Boolean(station.is24h),
  }
}

/** Stations via proxy same-origin `/api/stations` (plus d’appel direct data.gouv). */
export async function getStations(signal?: AbortSignal): Promise<Station[]> {
  const response = await fetch("/api/stations", { signal })

  if (!response.ok) {
    throw new Error(
      `Erreur API carburants : ${response.status} ${response.statusText}`,
    )
  }

  const data = (await response.json()) as { stations: ApiStation[] }
  return (data.stations ?? []).map(normalizeStation)
}
