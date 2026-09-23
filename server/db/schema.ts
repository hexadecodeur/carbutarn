import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  reputationScore: real("reputation_score").notNull().default(1),
  /** Incrémenté au logout / suppression → invalide tous les JWT émis. */
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    /** Hash SHA-256 de l’IP (rate limit), jamais l’IP en clair. */
    ipHash: text("ip_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("magic_link_email_created_idx").on(table.email, table.createdAt),
    index("magic_link_ip_created_idx").on(table.ipHash, table.createdAt),
  ],
)

export const stationsCache = pgTable("stations_cache", {
  id: text("id").primaryKey(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const officialPrices = pgTable(
  "official_prices",
  {
    stationId: text("station_id")
      .notNull()
      .references(() => stationsCache.id),
    fuelType: text("fuel_type").notNull(),
    price: doublePrecision("price").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.stationId, table.fuelType] })],
)

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    stationId: text("station_id")
      .notNull()
      .references(() => stationsCache.id),
    fuelType: text("fuel_type").notNull(),
    price: doublePrecision("price"),
    agreed: boolean("agreed").notNull(),
    /** Signalement « Rupture » (pas de prix). */
    outage: boolean("outage").notNull().default(false),
    /**
     * Anciennes colonnes GPS — plus écrites (minimisation).
     * Conservées nullable pour ne pas casser les bases existantes.
     */
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    weight: real("weight").notNull().default(1),
    /** floor(epochMs / REPORT_COOLDOWN_MS) — unicité anti-race. */
    cooldownBucket: integer("cooldown_bucket").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reports_user_station_fuel_bucket_uidx").on(
      table.userId,
      table.stationId,
      table.fuelType,
      table.cooldownBucket,
    ),
    index("reports_user_station_created_idx").on(
      table.userId,
      table.stationId,
      table.createdAt,
    ),
  ],
)

export const observedPrices = pgTable(
  "observed_prices",
  {
    stationId: text("station_id")
      .notNull()
      .references(() => stationsCache.id),
    fuelType: text("fuel_type").notNull(),
    price: doublePrecision("price").notNull(),
    sampleCount: integer("sample_count").notNull(),
    /** Consensus rupture (≥ 4 avis) — prioritaire sur le prix publié. */
    outage: boolean("outage").notNull().default(false),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.stationId, table.fuelType] })],
)
