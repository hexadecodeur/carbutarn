export type City = {
  name: string
  postalCodes: string[]
  latitude: number
  longitude: number
}

type GeoApiCity = {
  nom: string
  codesPostaux: string[]
  centre?: {
    coordinates: [number, number]
  }
}

export async function searchCities(
  query: string
): Promise<City[]> {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) {
    return []
  }

  const params = new URLSearchParams({
    nom: trimmedQuery,
    codeDepartement: "81",
    fields: "nom,codesPostaux,centre",
    boost: "population",
    limit: "8",
  })

  const response = await fetch(
    `https://geo.api.gouv.fr/communes?${params}`
  )

  if (!response.ok) {
    throw new Error(
      `Erreur API communes : ${response.status}`
    )
  }

  const data: GeoApiCity[] = await response.json()

  return data
    .filter((city) => city.centre)
    .map((city) => ({
      name: city.nom,
      postalCodes: city.codesPostaux,
      longitude: city.centre!.coordinates[0],
      latitude: city.centre!.coordinates[1],
    }))
}
