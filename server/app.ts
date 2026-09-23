import { Hono } from "hono"
import { cors } from "hono/cors"
import { bodyLimit } from "hono/body-limit"
import { authRoutes } from "./routes/auth"
import { stationsRoutes } from "./routes/stations"
import { cronRoutes } from "./routes/cron"
import { citiesRoutes } from "./routes/cities"
import { mapRoutes } from "./routes/map"
import { attachSession } from "./lib/requireAuth"
import type { AppEnv } from "./types"

const app = new Hono<AppEnv>().basePath("/api")

app.use(
  "*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: (c) => c.json({ error: "Payload trop volumineux" }, 413),
  }),
)

app.use("*", async (c, next) => {
  const origin = process.env.APP_URL ?? "http://localhost:5173"
  return cors({
    origin,
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })(c, next)
})

app.use("*", attachSession)

app.get("/health", (c) =>
  c.json({ ok: true, service: "carbutarn-api", ts: new Date().toISOString() }),
)

app.route("/auth", authRoutes)
app.route("/stations", stationsRoutes)
app.route("/cities", citiesRoutes)
app.route("/map", mapRoutes)
app.route("/cron", cronRoutes)

app.notFound((c) => c.json({ error: "Not found" }, 404))

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : "unknown"
  // Pas d’objet Error brut (peut contenir des URLs Neon)
  console.error("[api]", message)
  return c.json({ error: "Internal server error" }, 500)
})

export default app
