/**
 * Façade stations : Open Data + enrichissement OSM.
 * Point d’entrée unique pour le front — Phase 2 pourra y brancher l’API backend.
 */
import type { Station } from "../types/station"
import { getStations } from "./fuelApi"
import {
  enrichStationsWithBrands,
  fetchStationBrands,
} from "./osmBrands"

export type StationsLoadOptions = {
  signal?: AbortSignal
  /** Stations Open Data dès qu’elles sont prêtes (avant OSM) */
  onOfficial?: (stations: Station[]) => void
  /** Rafraîchissement Overpass après cache/snapshot */
  onBrandsFresh?: (stations: Station[]) => void
}

/**
 * Charge les stations du Tarn, puis enrichit enseignes/coords OSM.
 * `onOfficial` permet d’afficher la carte sans attendre Overpass.
 */
export async function loadStations(
  options: StationsLoadOptions = {},
): Promise<Station[]> {
  const { signal, onOfficial, onBrandsFresh } = options

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  const data = await getStations(signal)

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  onOfficial?.(data)

  try {
    const brands = await fetchStationBrands((fresh) => {
      if (signal?.aborted) return
      onBrandsFresh?.(enrichStationsWithBrands(data, fresh))
    })

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }

    return enrichStationsWithBrands(data, brands)
  } catch (brandError) {
    console.error("Enseignes OSM indisponibles :", brandError)
    return data
  }
}
