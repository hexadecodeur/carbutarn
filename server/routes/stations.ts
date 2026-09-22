import { Hono } from "hono"
import { and, eq, gte, desc } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { getDb } from "../db/client"
import {
  officialPrices,
  observedPrices,
  reports,
  stationsCache,
} from "../db/schema"
import {
  CONSENSUS_WINDOW_MS,
  MIN_SAMPLES_TO_DISPLAY,
  REPORT_COOLDOWN_MS,
  isPriceInTolerance,
  reportWeight,
} from "../lib/antiAbuse"
import { weightedMedian } from "../lib/consensus"
import { FUEL_TYPES, type AppEnv, type FuelTypeApi } from "../types"

export const stationsRoutes = new Hono<AppEnv>()

stationsRoutes.get("/:id/prices", async (c) => {
  const stationId = c.req.param("id")
  const db = getDb()
  const userId = c.get("userId")

  const official = await db
    .select()
    .from(officialPrices)
    .where(eq(officialPrices.stationId, stationId))

  const observed = await db
    .select()
    .from(observedPrices)
    .where(eq(observedPrices.stationId, stationId))

  let reportedFuelTypes: string[] = []
  let lastReportAt: string | undefined

  if (userId) {
    const since = new Date(Date.now() - REPORT_COOLDOWN_MS)
    const recent = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.userId, userId),
          eq(reports.stationId, stationId),
          gte(reports.createdAt, since),
        ),
      )

    reportedFuelTypes = [...new Set(recent.map((row) => row.fuelType))]

    const [last] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.userId, userId), eq(reports.stationId, stationId)))
      .orderBy(desc(reports.createdAt))
      .limit(1)

    if (last) {
      lastReportAt = last.createdAt.toISOString()
    }
  }

  return c.json({
    stationId,
    official: official.map((row) => ({
      type: row.fuelType,
      price: row.price,
      updatedAt: row.updatedAt?.toISOString() ?? null,
    })),
    observed: observed.map((row) => ({
      type: row.fuelType,
      price: row.price,
      sampleCount: row.sampleCount,
      computedAt: row.computedAt.toISOString(),
      /** Affichage public dès MIN_SAMPLES_TO_DISPLAY avis */
      published: row.sampleCount >= MIN_SAMPLES_TO_DISPLAY,
    })),
    viewer: {
      authenticated: Boolean(userId),
      canReport: Boolean(userId),
      reportedFuelTypes,
      lastReportAt,
    },
  })
})

stationsRoutes.post("/:id/reports", async (c) => {
  const userId = c.get("userId")
  if (!userId) {
    return c.json({ error: "Authentification requise" }, 401)
  }

  const stationId = c.req.param("id")
  const body = await c.req.json().catch(() => null)

  const fuelType = body?.fuelType as FuelTypeApi | undefined
  const agreed = body?.agreed
  const price =
    typeof body?.price === "number"
      ? body.price
      : typeof body?.price === "string"
        ? Number(body.price)
        : undefined
  const lat =
    typeof body?.lat === "number"
      ? body.lat
      : typeof body?.lat === "string"
        ? Number(body.lat)
        : null
  const lon =
    typeof body?.lon === "number"
      ? body.lon
      : typeof body?.lon === "string"
        ? Number(body.lon)
        : null

  if (!fuelType || !FUEL_TYPES.includes(fuelType)) {
    return c.json({ error: "Carburant invalide" }, 400)
  }
  if (typeof agreed !== "boolean") {
    return c.json({ error: "Champ agreed requis" }, 400)
  }
  if (!agreed && (price == null || Number.isNaN(price) || price <= 0)) {
    return c.json({ error: "Prix corrigé requis" }, 400)
  }

  const db = getDb()

  const [station] = await db
    .select()
    .from(stationsCache)
    .where(eq(stationsCache.id, stationId))
    .limit(1)

  if (!station) {
    return c.json(
      { error: "Station inconnue — lance d’abord la sync Open Data" },
      404,
    )
  }

  const since = new Date(Date.now() - REPORT_COOLDOWN_MS)
  const recent = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.userId, userId),
        eq(reports.stationId, stationId),
        eq(reports.fuelType, fuelType),
        gte(reports.createdAt, since),
      ),
    )
    .limit(1)

  if (recent.length > 0) {
    return c.json(
      { error: "Tu as déjà signalé ce carburant pour cette station (délai 2 h)" },
      429,
    )
  }

  const [official] = await db
    .select()
    .from(officialPrices)
    .where(
      and(
        eq(officialPrices.stationId, stationId),
        eq(officialPrices.fuelType, fuelType),
      ),
    )
    .limit(1)

  if (!official) {
    return c.json({ error: "Pas de prix officiel pour ce carburant" }, 404)
  }

  if (!agreed && price != null && !isPriceInTolerance(price, official.price)) {
    return c.json(
      {
        error: `Prix hors fourchette (±15 % du prix officiel ${official.price.toFixed(3)} €)`,
      },
      422,
    )
  }

  const weight = reportWeight({
    stationLat: station.latitude,
    stationLon: station.longitude,
    userLat: lat,
    userLon: lon,
  })

  // Confirmation : on stocke le prix officiel comme ancre pour le consensus
  const storedPrice = agreed ? official.price : price!

  await db.insert(reports).values({
    id: randomUUID(),
    userId,
    stationId,
    fuelType,
    price: storedPrice,
    agreed,
    latitude: lat,
    longitude: lon,
    weight,
  })

  await recomputeObserved(stationId, fuelType)

  return c.json({ ok: true })
})

async function recomputeObserved(stationId: string, fuelType: string) {
  const db = getDb()
  const since = new Date(Date.now() - CONSENSUS_WINDOW_MS)

  const rows = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.stationId, stationId),
        eq(reports.fuelType, fuelType),
        gte(reports.createdAt, since),
      ),
    )

  const samples = rows
    .filter((row) => row.price != null)
    .map((row) => ({
      value: row.price as number,
      weight: row.weight,
    }))

  const median = weightedMedian(samples)
  if (median == null) return

  await db
    .insert(observedPrices)
    .values({
      stationId,
      fuelType,
      price: median,
      sampleCount: samples.length,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [observedPrices.stationId, observedPrices.fuelType],
      set: {
        price: median,
        sampleCount: samples.length,
        computedAt: new Date(),
      },
    })
}
