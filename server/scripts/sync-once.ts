/**
 * Lance une sync Open Data → Neon une fois (dev / ops).
 * Usage: pnpm sync:official
 */
import { config } from "dotenv"
import { syncOfficialPrices } from "../lib/syncOfficial"

config({ path: ".env.local" })
config({ path: ".env" })

const result = await syncOfficialPrices()
console.log("Sync OK:", result)
