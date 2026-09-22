/**
 * Bundle l’API Hono en un seul fichier pour Vercel.
 * Sortie : api/[[...route]].js (catch-all /api/*).
 * Ne pas gitignorer ce fichier : Vercel n’upload pas les outputs gitignored.
 */
import * as esbuild from "esbuild"
import { mkdir } from "node:fs/promises"

await mkdir("api", { recursive: true })

const outfile = "api/[[...route]].js"

await esbuild.build({
  entryPoints: ["server/vercel-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile,
  sourcemap: false,
  logLevel: "info",
  packages: "bundle",
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
})

console.log(`API bundled → ${outfile}`)
