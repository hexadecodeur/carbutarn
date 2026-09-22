import type { ListFuelType, PriceSortOrder, SortBy, Station } from "../types/station"
import { getDistanceKm } from "./distance"

export type ReferenceLocation = {
  latitude: number
  longitude: number
}

export function withDistance(
  station: Station,
  reference: ReferenceLocation | null,
): Station {
  if (!reference) return station
  return {
    ...station,
    distance: getDistanceKm(
      reference.latitude,
      reference.longitude,
      station.latitude,
      station.longitude,
    ),
  }
}

export function sortStations(
  stations: Station[],
  options: {
    reference: ReferenceLocation | null
    sortBy: SortBy
    selectedFuel: ListFuelType | null
    priceOrder: PriceSortOrder
  },
): Station[] {
  const { reference, sortBy, selectedFuel, priceOrder } = options

  return [...stations]
    .map((station) => withDistance(station, reference))
    .sort((a, b) => {
      const usePrice = sortBy === "price" && selectedFuel !== null

      if (!usePrice) {
        if (a.distance === undefined && b.distance === undefined) return 0
        if (a.distance === undefined) return 1
        if (b.distance === undefined) return -1
        return a.distance - b.distance
      }

      const priceA = a.fuels.find((fuel) => fuel.type === selectedFuel)?.price
      const priceB = b.fuels.find((fuel) => fuel.type === selectedFuel)?.price

      if (priceA === undefined && priceB === undefined) return 0
      if (priceA === undefined) return 1
      if (priceB === undefined) return -1
      return priceOrder === "asc" ? priceA - priceB : priceB - priceA
    })
}
