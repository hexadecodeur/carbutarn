import { useEffect, useState } from "react"
import type { ListFuelType, PriceSortOrder, SortBy } from "../types/station"
import {
  DEFAULT_FILTER_PREFS,
  loadFilterPrefs,
  saveFilterPrefs,
  type MapPriceSource,
} from "../utils/filterPrefs"

export function useFilterPrefs() {
  const [selectedFuel, setSelectedFuel] = useState<ListFuelType | null>(() =>
    typeof window !== "undefined"
      ? loadFilterPrefs().selectedFuel
      : DEFAULT_FILTER_PREFS.selectedFuel,
  )
  const [sortBy, setSortBy] = useState<SortBy>(() =>
    typeof window !== "undefined"
      ? loadFilterPrefs().sortBy
      : DEFAULT_FILTER_PREFS.sortBy,
  )
  const [priceOrder, setPriceOrder] = useState<PriceSortOrder>(() =>
    typeof window !== "undefined"
      ? loadFilterPrefs().priceOrder
      : DEFAULT_FILTER_PREFS.priceOrder,
  )
  const [mapPriceSource, setMapPriceSource] = useState<MapPriceSource>(() =>
    typeof window !== "undefined"
      ? loadFilterPrefs().mapPriceSource
      : DEFAULT_FILTER_PREFS.mapPriceSource,
  )

  useEffect(() => {
    saveFilterPrefs({ selectedFuel, sortBy, priceOrder, mapPriceSource })
  }, [selectedFuel, sortBy, priceOrder, mapPriceSource])

  function handleSelectedFuelChange(fuel: ListFuelType | null) {
    setSelectedFuel(fuel)
    if (fuel === null && sortBy === "price") {
      setSortBy("distance")
    }
  }

  function handleSortByChange(next: SortBy) {
    if (next === "price" && selectedFuel === null) return

    if (next === "price" && sortBy === "price") {
      setPriceOrder((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    if (next === "price") {
      setPriceOrder("asc")
    }

    setSortBy(next)
  }

  function handleMapPriceSourceChange(source: MapPriceSource) {
    setMapPriceSource(source)
  }

  return {
    selectedFuel,
    sortBy,
    priceOrder,
    mapPriceSource,
    handleSelectedFuelChange,
    handleSortByChange,
    handleMapPriceSourceChange,
  }
}
