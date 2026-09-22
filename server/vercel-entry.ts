import { handle } from "@hono/node-server/vercel"
import app from "./app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default handle(app)
