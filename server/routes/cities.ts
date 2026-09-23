import { Hono } from "hono"
import type { AppEnv } from "../types"

export const citiesRoutes = new Hono<AppEnv>()

type GeoApiCity = {
  nom: string
  codesPostaux: string[]
  centre?: {
    coordinates: [number, number]
  }
}

/** Proxy geo.api.gouv.fr — l’IP client n’est plus exposée au tiers. */
citiesRoutes.get("/", async (c) => {
  const query = (c.req.query("q") ?? "").trim()
  if (query.length < 2 || query.length > 80) {
    return c.json({ cities: [] })
  }

  const params = new URLSearchParams({
    nom: query,
    codeDepartement: "81",
    fields: "nom,codesPostaux,centre",
    boost: "population",
    limit: "8",
  })

  try {
    const response = await fetch(
      `https://geo.api.gouv.fr/communes?${params}`,
      { signal: AbortSignal.timeout(8_000) },
    )
    if (!response.ok) {
      return c.json({ error: "Communes indisponibles" }, 502)
    }

    const data = (await response.json()) as GeoApiCity[]
    const cities = data
      .filter((city) => city.centre)
      .map((city) => ({
        name: city.nom,
        postalCodes: city.codesPostaux,
        longitude: city.centre!.coordinates[0],
        latitude: city.centre!.coordinates[1],
      }))

    c.header("Cache-Control", "public, max-age=3600")
    return c.json({ cities })
  } catch {
    return c.json({ error: "Communes indisponibles" }, 502)
  }
})
