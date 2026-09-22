import type { FuelPrice, FuelType, Station } from "../types/station"
import { getStationDisplayName } from "../types/station"

const API_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records"

type ApiStation = {
  id: number
  adresse: string | null
  cp: string | null
  ville?: string | null
  code_departement: string

  geom: {
    lon: number
    lat: number
  } | null

  gazole_prix: number | null
  gazole_maj: string | null

  sp95_prix: number | null
  sp95_maj: string | null

  e10_prix: number | null
  e10_maj: string | null

  sp98_prix: number | null
  sp98_maj: string | null

  e85_prix: number | null
  e85_maj: string | null

  gplc_prix: number | null
  gplc_maj: string | null

  services_service?: string[] | null
  horaires?: string | null
  horaires_automate_24_24?: string | null
}

type ApiResponse = {
  total_count: number
  results: ApiStation[]
}

function addFuel(
  fuels: FuelPrice[],
  type: FuelType,
  price: number | null,
  updatedAt: string | null,
) {
  if (price === null || price === undefined) return

  fuels.push({
    type,
    price,
    updatedAt,
  })
}

function normalizeStation(station: ApiStation): Station | null {
  if (!station.geom) return null

  const fuels: FuelPrice[] = []

  addFuel(fuels, "Gazole", station.gazole_prix, station.gazole_maj)
  addFuel(fuels, "SP95", station.sp95_prix, station.sp95_maj)
  addFuel(fuels, "E10", station.e10_prix, station.e10_maj)
  addFuel(fuels, "SP98", station.sp98_prix, station.sp98_maj)
  addFuel(fuels, "E85", station.e85_prix, station.e85_maj)
  addFuel(fuels, "GPLc", station.gplc_prix, station.gplc_maj)

  const address = station.adresse?.trim() || "Adresse inconnue"
  const city = station.ville?.trim() ?? ""
  const brand = null

  return {
    id: String(station.id),

    latitude: station.geom.lat,
    longitude: station.geom.lon,

    brand,
    name: getStationDisplayName({ brand, name: "", address, city }),

    address,
    city,
    postalCode: station.cp ?? "",

    fuels,

    services: station.services_service ?? [],
    openingHours: station.horaires ?? null,
    is24h:
      station.horaires_automate_24_24 === "Oui" ||
      station.horaires_automate_24_24 === "1",
  }
}

export async function getStations(signal?: AbortSignal): Promise<Station[]> {
  const params = new URLSearchParams({
    where: 'code_departement="81"',
    limit: "100",
  })

  const response = await fetch(`${API_URL}?${params}`, { signal })

  if (!response.ok) {
    throw new Error(
      `Erreur API carburants : ${response.status} ${response.statusText}`,
    )
  }

  const data: ApiResponse = await response.json()

  return data.results
    .map(normalizeStation)
    .filter((station): station is Station => station !== null)
}
