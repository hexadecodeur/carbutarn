/**
 * Proxy serveur Open Data carburants (Tarn).
 * Le navigateur / l’app n’appellent plus data.economie.gouv.fr directement.
 */
import type { FuelTypeApi } from "../types"

const OPEN_DATA_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records"

type ApiStation = {
  id: number
  adresse: string | null
  cp: string | null
  ville?: string | null
  geom: { lon: number; lat: number } | null
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

export type PublicStation = {
  id: string
  latitude: number
  longitude: number
  brand: null
  name: string
  address: string
  city: string
  postalCode: string
  fuels: { type: FuelTypeApi; price: number; updatedAt: string | null }[]
  services: string[]
  openingHours: string | null
  is24h: boolean
}

function addFuel(
  fuels: PublicStation["fuels"],
  type: FuelTypeApi,
  price: number | null,
  updatedAt: string | null,
) {
  if (price == null) return
  fuels.push({ type, price, updatedAt })
}

function displayName(address: string, city: string): string {
  if (city) return `${address} — ${city}`
  return address
}

function normalize(station: ApiStation): PublicStation | null {
  if (!station.geom) return null

  const fuels: PublicStation["fuels"] = []
  addFuel(fuels, "Gazole", station.gazole_prix, station.gazole_maj)
  addFuel(fuels, "SP95", station.sp95_prix, station.sp95_maj)
  addFuel(fuels, "E10", station.e10_prix, station.e10_maj)
  addFuel(fuels, "SP98", station.sp98_prix, station.sp98_maj)
  addFuel(fuels, "E85", station.e85_prix, station.e85_maj)
  addFuel(fuels, "GPLc", station.gplc_prix, station.gplc_maj)

  const address = station.adresse?.trim() || "Adresse inconnue"
  const city = station.ville?.trim() ?? ""

  return {
    id: String(station.id),
    latitude: station.geom.lat,
    longitude: station.geom.lon,
    brand: null,
    name: displayName(address, city),
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

let cache: { at: number; stations: PublicStation[] } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export async function fetchOpenDataStations(): Promise<PublicStation[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.stations
  }

  const params = new URLSearchParams({
    where: 'code_departement="81"',
    limit: "100",
  })

  const response = await fetch(`${OPEN_DATA_URL}?${params}`, {
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`Open Data ${response.status}`)
  }

  const data = (await response.json()) as { results: ApiStation[] }
  const stations = data.results
    .map(normalize)
    .filter((s): s is PublicStation => s !== null)

  cache = { at: Date.now(), stations }
  return stations
}
