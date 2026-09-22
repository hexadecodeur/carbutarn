import { Hono } from "hono"
import { cors } from "hono/cors"
import { getCookie } from "hono/cookie"
import { authRoutes } from "./routes/auth"
import { stationsRoutes } from "./routes/stations"
import { cronRoutes } from "./routes/cron"
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth"
import type { AppEnv } from "./types"

const app = new Hono<AppEnv>().basePath("/api")

app.use("*", async (c, next) => {
  const origin = process.env.APP_URL ?? "http://localhost:5173"
  return cors({
    origin,
    credentials: true,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })(c, next)
})

app.use("*", async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    const session = await verifySessionToken(token)
    if (session) {
      c.set("userId", session.userId)
      c.set("userEmail", session.email)
    }
  }
  await next()
})

app.get("/health", (c) =>
  c.json({ ok: true, service: "carbutarn-api", ts: new Date().toISOString() }),
)

app.route("/auth", authRoutes)
app.route("/stations", stationsRoutes)
app.route("/cron", cronRoutes)

app.notFound((c) => c.json({ error: "Not found" }, 404))

app.onError((err, c) => {
  console.error("[api]", err)
  return c.json({ error: "Internal server error" }, 500)
})

export default app
