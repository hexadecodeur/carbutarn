export type City = {
  name: string
  postalCodes: string[]
  latitude: number
  longitude: number
}

/** Communes via proxy `/api/cities` (plus d’appel direct geo.api.gouv.fr). */
export async function searchCities(query: string): Promise<City[]> {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) {
    return []
  }

  const params = new URLSearchParams({ q: trimmedQuery })
  const response = await fetch(`/api/cities?${params}`)

  if (!response.ok) {
    throw new Error(`Erreur API communes : ${response.status}`)
  }

  const data = (await response.json()) as { cities: City[] }
  return data.cities ?? []
}
