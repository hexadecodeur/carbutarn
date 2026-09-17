import type { FuelPrice, FuelType, Station } from "../types/station"

const API_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records"

type ApiStation = {
  id: number
  address: string | null
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

  return {
    id: String(station.id),

    latitude: station.geom.lat,
    longitude: station.geom.lon,

    address: station.address ?? "Adresse inconnue",
    city: station.ville ?? "",
    postalCode: station.cp ?? "",

    fuels,

    services: station.services_service ?? [],
    openingHours: station.horaires ?? null,
  }
}

export async function getStations(): Promise<Station[]> {
  console.log("Chargement des stations du Tarn...")

  const params = new URLSearchParams({
    where: 'code_departement="81"',
    limit: "100",
  })

  const response = await fetch(`${API_URL}?${params}`)

  if (!response.ok) {
    throw new Error(
      `Erreur API carburants : ${response.status} ${response.statusText}`,
    )
  }

  const data: ApiResponse = await response.json()

  const stations = data.results
    .map(normalizeStation)
    .filter((station): station is Station => station !== null)

  console.log(`${stations.length} stations du Tarn chargées`)
  console.log("Première station normalisée :", stations[0])
  console.table(
    stations.map((station) => ({
      id: station.id,
      ville: station.city,
      cp: station.postalCode,
      adresse: station.address,
      gazole: station.fuels.find((f) => f.type === "Gazole")?.price,
      e10: station.fuels.find((f) => f.type === "E10")?.price,
      latitude: station.latitude,
      longitude: station.longitude,
    })),
  )

  return stations
}
