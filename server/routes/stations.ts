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
  REPORT_COOLDOWN_MS,
  cooldownBucket,
  isPriceInTolerance,
  reportWeight,
} from "../lib/antiAbuse"
import {
  computeConsensus,
  MIN_CONSENSUS_WEIGHT,
  MIN_OUTAGE_WEIGHT,
  totalWeight,
} from "../lib/consensus"
import { toIsoOrNull } from "../lib/dates"
import { fetchOpenDataStations } from "../lib/openDataStations"
import { authError, getAuthedUser } from "../lib/requireAuth"
import { FUEL_TYPES, type AppEnv, type FuelTypeApi } from "../types"

export const stationsRoutes = new Hono<AppEnv>()

/** Liste des stations (proxy serveur → Open Data, pas d’appel direct client). */
stationsRoutes.get("/", async (c) => {
  try {
    const stations = await fetchOpenDataStations()
    c.header("Cache-Control", "public, max-age=300")
    return c.json({ stations })
  } catch {
    console.error("[stations] open data proxy failed")
    return c.json({ error: "Stations indisponibles" }, 502)
  }
})

/**
 * Prix / ruptures publiés (carte « partagés »).
 * Uniquement les consensus atteints — le fallback officiel est côté client.
 */
stationsRoutes.get("/observed", async (c) => {
  const db = getDb()
  const rows = await db.select().from(observedPrices)

  const prices = rows
    .filter((row) => {
      if (row.outage) return row.sampleCount >= MIN_OUTAGE_WEIGHT
      return row.sampleCount >= MIN_CONSENSUS_WEIGHT
    })
    .map((row) => ({
      stationId: row.stationId,
      fuelType: row.fuelType,
      price: row.price,
      outage: row.outage,
      sampleCount: row.sampleCount,
      computedAt: toIsoOrNull(row.computedAt) ?? new Date().toISOString(),
    }))

  c.header("Cache-Control", "public, max-age=60")
  return c.json({ prices })
})

stationsRoutes.get("/:id/prices", async (c) => {
  const stationId = c.req.param("id")
  if (!stationId || stationId.length > 64) {
    return c.json({ error: "Station invalide" }, 400)
  }

  const db = getDb()
  const userId = c.get("userId")

  const official = await db
    .select()
    .from(officialPrices)
    .where(eq(officialPrices.stationId, stationId))

  const observedRows = await db
    .select()
    .from(observedPrices)
    .where(eq(observedPrices.stationId, stationId))

  const observedByFuel = new Map(
    observedRows.map((row) => [row.fuelType, row]),
  )

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

    const iso = last ? toIsoOrNull(last.createdAt) : null
    if (iso) lastReportAt = iso
  }

  /** Une entrée par carburant officiel : rupture > consensus > fallback officiel. */
  const observed = official.map((off) => {
    const row = observedByFuel.get(off.fuelType)

    if (row?.outage && row.sampleCount >= MIN_OUTAGE_WEIGHT) {
      return {
        type: off.fuelType,
        published: true as const,
        source: "outage" as const,
        outage: true as const,
        sampleCount: row.sampleCount,
        computedAt: toIsoOrNull(row.computedAt) ?? new Date().toISOString(),
      }
    }

    if (
      row &&
      !row.outage &&
      row.sampleCount >= MIN_CONSENSUS_WEIGHT
    ) {
      return {
        type: off.fuelType,
        published: true as const,
        source: "community" as const,
        outage: false as const,
        price: row.price,
        sampleCount: row.sampleCount,
        computedAt: toIsoOrNull(row.computedAt) ?? new Date().toISOString(),
      }
    }

    return {
      type: off.fuelType,
      published: true as const,
      source: "official" as const,
      outage: false as const,
      price: off.price,
      sampleCount: row?.sampleCount,
      computedAt: toIsoOrNull(row?.computedAt ?? null) ?? undefined,
    }
  })

  return c.json({
    stationId,
    official: official.map((row) => ({
      type: row.fuelType,
      price: row.price,
      updatedAt: toIsoOrNull(row.updatedAt),
    })),
    observed,
    viewer: {
      authenticated: Boolean(userId),
      canReport: Boolean(userId),
      reportedFuelTypes,
      lastReportAt,
    },
  })
})

stationsRoutes.post("/:id/reports", async (c) => {
  const authed = getAuthedUser(c)
  if (!authed) return authError(c)
  const { userId } = authed

  const stationId = c.req.param("id")
  if (!stationId || stationId.length > 64) {
    return c.json({ error: "Station invalide" }, 400)
  }

  const body = await c.req.json().catch(() => null)

  const fuelType = body?.fuelType as FuelTypeApi | undefined
  const outage = body?.outage === true
  const agreed = outage ? false : body?.agreed
  const price =
    typeof body?.price === "number"
      ? body.price
      : typeof body?.price === "string"
        ? Number(body.price)
        : undefined

  if (!fuelType || !FUEL_TYPES.includes(fuelType)) {
    return c.json({ error: "Carburant invalide" }, 400)
  }

  if (!outage && typeof agreed !== "boolean") {
    return c.json({ error: "Champ agreed requis" }, 400)
  }

  if (
    !outage &&
    !agreed &&
    (price == null ||
      Number.isNaN(price) ||
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 10)
  ) {
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

  if (
    !outage &&
    !agreed &&
    price != null &&
    !isPriceInTolerance(price, official.price)
  ) {
    return c.json(
      {
        error: `Prix hors fourchette (±10 % du prix officiel ${official.price.toFixed(3)} €)`,
      },
      422,
    )
  }

  const weight = reportWeight()
  const storedPrice = outage
    ? null
    : agreed
      ? official.price
      : price!
  const bucket = cooldownBucket()

  try {
    await db.insert(reports).values({
      id: randomUUID(),
      userId,
      stationId,
      fuelType,
      price: storedPrice,
      agreed: Boolean(agreed),
      outage,
      latitude: null,
      longitude: null,
      weight,
      cooldownBucket: bucket,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes("unique") ||
      message.includes("duplicate") ||
      message.includes("23505")
    ) {
      return c.json(
        {
          error:
            "Tu as déjà signalé ce carburant pour cette station (délai 2 h)",
        },
        429,
      )
    }
    throw error
  }

  await recomputeObserved(stationId, fuelType, official.price)

  return c.json({ ok: true })
})

async function recomputeObserved(
  stationId: string,
  fuelType: string,
  officialPrice: number,
) {
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

  const outageWeight = totalWeight(
    rows.filter((row) => row.outage).map((row) => ({ value: 0, weight: row.weight })),
  )

  if (outageWeight >= MIN_OUTAGE_WEIGHT) {
    await db
      .insert(observedPrices)
      .values({
        stationId,
        fuelType,
        price: officialPrice,
        sampleCount: outageWeight,
        outage: true,
        computedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [observedPrices.stationId, observedPrices.fuelType],
        set: {
          price: officialPrice,
          sampleCount: outageWeight,
          outage: true,
          computedAt: new Date(),
        },
      })
    return
  }

  const samples = rows
    .filter((row) => !row.outage && row.price != null)
    .map((row) => ({
      value: row.price as number,
      weight: row.weight,
    }))

  const consensus = computeConsensus(samples)
  if (consensus != null) {
    await db
      .insert(observedPrices)
      .values({
        stationId,
        fuelType,
        price: consensus.price,
        sampleCount: consensus.sampleCount,
        outage: false,
        computedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [observedPrices.stationId, observedPrices.fuelType],
        set: {
          price: consensus.price,
          sampleCount: consensus.sampleCount,
          outage: false,
          computedAt: new Date(),
        },
      })
    return
  }

  // Plus assez d’avis rupture ni de prix → retomber sur le fallback officiel
  await db
    .update(observedPrices)
    .set({
      outage: false,
      sampleCount: 0,
      price: officialPrice,
      computedAt: new Date(),
    })
    .where(
      and(
        eq(observedPrices.stationId, stationId),
        eq(observedPrices.fuelType, fuelType),
      ),
    )
}
