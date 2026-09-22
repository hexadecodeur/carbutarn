/**
 * Bundle l’API Hono en un seul fichier pour Vercel.
 * Les imports `../server/*` hors de `/api` ne sont pas résolus correctement
 * en ESM sur les Serverless Functions.
 */
import * as esbuild from "esbuild"
import { mkdir } from "node:fs/promises"

await mkdir("api", { recursive: true })

await esbuild.build({
  entryPoints: ["server/vercel-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "api/index.js",
  sourcemap: false,
  logLevel: "info",
  // Dépendances natives / optionnelles à laisser externes si besoin
  packages: "bundle",
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
})

console.log("API bundled → api/index.js")
