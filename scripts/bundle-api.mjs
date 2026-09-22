/**
 * Bundle l’API Hono en un seul fichier pour Vercel.
 * Sortie : api/[[...route]].js (catch-all /api/*).
 *
 * Important : ce fichier doit être commité. Avec framework Vite + outputDirectory,
 * une fonction créée uniquement pendant le build n’est pas détectée → 404 NOT_FOUND.
 * Après une modif serveur : pnpm bundle:api puis commit api/[[...route]].js.
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
