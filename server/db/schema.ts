import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  reputationScore: real("reputation_score").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

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

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  stationId: text("station_id")
    .notNull()
    .references(() => stationsCache.id),
  fuelType: text("fuel_type").notNull(),
  /** null si confirmation « Prix OK » sans nouveau prix */
  price: doublePrecision("price"),
  agreed: boolean("agreed").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  weight: real("weight").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const observedPrices = pgTable(
  "observed_prices",
  {
    stationId: text("station_id")
      .notNull()
      .references(() => stationsCache.id),
    fuelType: text("fuel_type").notNull(),
    price: doublePrecision("price").notNull(),
    sampleCount: integer("sample_count").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.stationId, table.fuelType] })],
)
