/**
 * Bundle l’API Hono en un seul fichier pour Vercel.
 * Sortie : api/index.js + rewrite vercel.json `/api/(.*)` → `/api/index`.
 *
 * Les catch-all `[...route]` / `[[...route]]` ne matchent qu’un segment hors Next.js
 * (/api/health OK, /api/auth/me → 404). Le rewrite conserve l’URL d’origine pour Hono.
 *
 * Après modif serveur : pnpm bundle:api puis commit de api/index.js.
 */
import * as esbuild from "esbuild"
import { mkdir, rm } from "node:fs/promises"

await mkdir("api", { recursive: true })

await rm("api/[[...route]].js", { force: true })
await rm("api/[...route].js", { force: true })

const outfile = "api/index.js"

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
