import type { ListFuelType, SortBy } from "../types/station"

export const LIST_FUEL_TYPES: ListFuelType[] = [
  "Gazole",
  "E10",
  "SP98",
  "E85",
]

export const FUEL_OPTIONS: { value: ListFuelType; label: string }[] =
  LIST_FUEL_TYPES.map((value) => ({ value, label: value }))

export const SORT_BY_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "distance", label: "Distance" },
  { value: "price", label: "Prix" },
]
