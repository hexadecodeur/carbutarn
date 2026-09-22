/**
 * Bundle l’API Hono en un seul fichier pour Vercel.
 * Sortie : api/[...route].js (catch-all /api/* — un ou plusieurs segments).
 *
 * Ne pas utiliser [[...route]] (optionnel) : sur le dossier api/ Vercel, les
 * chemins à 2+ segments (/api/auth/me) renvoient 404 NOT_FOUND.
 *
 * Ce fichier doit être commité. Après modif serveur : pnpm bundle:api puis commit.
 */
import * as esbuild from "esbuild"
import { mkdir, rm } from "node:fs/promises"

await mkdir("api", { recursive: true })

// Anciens noms éventuels
await rm("api/[[...route]].js", { force: true })
await rm("api/index.js", { force: true })

const outfile = "api/[...route].js"

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
