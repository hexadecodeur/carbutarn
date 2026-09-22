import { getDb } from "../db/client"
import { officialPrices, stationsCache } from "../db/schema"
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
}

type FuelRow = {
  type: FuelTypeApi
  price: number
  updatedAt: Date | null
}

function fuelsFromApi(station: ApiStation): FuelRow[] {
  const rows: FuelRow[] = []
  const add = (
    type: FuelTypeApi,
    price: number | null,
    maj: string | null,
  ) => {
    if (price == null) return
    rows.push({
      type,
      price,
      updatedAt: maj ? new Date(maj) : null,
    })
  }

  add("Gazole", station.gazole_prix, station.gazole_maj)
  add("SP95", station.sp95_prix, station.sp95_maj)
  add("E10", station.e10_prix, station.e10_maj)
  add("SP98", station.sp98_prix, station.sp98_maj)
  add("E85", station.e85_prix, station.e85_maj)
  add("GPLc", station.gplc_prix, station.gplc_maj)
  return rows
}

export async function syncOfficialPrices(): Promise<{
  stations: number
  prices: number
}> {
  const params = new URLSearchParams({
    where: 'code_departement="81"',
    limit: "100",
  })

  const response = await fetch(`${OPEN_DATA_URL}?${params}`)
  if (!response.ok) {
    throw new Error(`Open Data ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    results: ApiStation[]
  }

  const db = getDb()
  let stationCount = 0
  let priceCount = 0
  const syncedAt = new Date()

  for (const station of data.results) {
    if (!station.geom) continue

    const id = String(station.id)
    await db
      .insert(stationsCache)
      .values({
        id,
        latitude: station.geom.lat,
        longitude: station.geom.lon,
        address: station.adresse,
        city: station.ville ?? null,
        postalCode: station.cp,
        updatedAt: syncedAt,
      })
      .onConflictDoUpdate({
        target: stationsCache.id,
        set: {
          latitude: station.geom.lat,
          longitude: station.geom.lon,
          address: station.adresse,
          city: station.ville ?? null,
          postalCode: station.cp,
          updatedAt: syncedAt,
        },
      })

    stationCount += 1

    for (const fuel of fuelsFromApi(station)) {
      await db
        .insert(officialPrices)
        .values({
          stationId: id,
          fuelType: fuel.type,
          price: fuel.price,
          updatedAt: fuel.updatedAt,
          syncedAt,
        })
        .onConflictDoUpdate({
          target: [officialPrices.stationId, officialPrices.fuelType],
          set: {
            price: fuel.price,
            updatedAt: fuel.updatedAt,
            syncedAt,
          },
        })
      priceCount += 1
    }
  }

  return { stations: stationCount, prices: priceCount }
}
