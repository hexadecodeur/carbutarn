import { serve } from "@hono/node-server"
import { config } from "dotenv"
import app from "./app"

config({ path: ".env.local" })
config({ path: ".env" })

const port = Number(process.env.API_PORT ?? 8787)

console.log(`CarbuTarn API → http://localhost:${port}/api/health`)

serve({
  fetch: app.fetch,
  port,
})
