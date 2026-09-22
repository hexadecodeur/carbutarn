import type { ListFuelType, PriceSortOrder, SortBy } from "../types/station"
import { LIST_FUEL_TYPES } from "../constants/filters"

const STORAGE_KEY = "carbutarn:filter-prefs"

export type FilterPrefs = {
  selectedFuel: ListFuelType | null
  sortBy: SortBy
  priceOrder: PriceSortOrder
}

export const DEFAULT_FILTER_PREFS: FilterPrefs = {
  selectedFuel: null,
  sortBy: "distance",
  priceOrder: "asc",
}

function isListFuel(value: unknown): value is ListFuelType {
  return (
    typeof value === "string" &&
    (LIST_FUEL_TYPES as readonly string[]).includes(value)
  )
}

function isSortBy(value: unknown): value is SortBy {
  return value === "distance" || value === "price"
}

function isPriceOrder(value: unknown): value is PriceSortOrder {
  return value === "asc" || value === "desc"
}

export function loadFilterPrefs(): FilterPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_FILTER_PREFS }

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_FILTER_PREFS }
    }

    const data = parsed as Record<string, unknown>
    const selectedFuel =
      data.selectedFuel === null
        ? null
        : isListFuel(data.selectedFuel)
          ? data.selectedFuel
          : null
    const sortBy = isSortBy(data.sortBy) ? data.sortBy : "distance"
    const priceOrder = isPriceOrder(data.priceOrder)
      ? data.priceOrder
      : "asc"

    return {
      selectedFuel,
      sortBy: selectedFuel === null && sortBy === "price" ? "distance" : sortBy,
      priceOrder,
    }
  } catch {
    return { ...DEFAULT_FILTER_PREFS }
  }
}

export function saveFilterPrefs(prefs: FilterPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}
