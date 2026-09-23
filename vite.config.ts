import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"

export default defineConfig(({ mode }) => {
  // Préfixe vide : lit SENTRY_* (sans VITE_) depuis .env* / process.env (Vercel)
  const env = loadEnv(mode, process.cwd(), "")
  const sentryDsn = env.SENTRY_DSN || process.env.SENTRY_DSN || ""
  const sentryAuthToken =
    env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN || ""
  const sentryOrg = env.SENTRY_ORG || process.env.SENTRY_ORG || ""
  const sentryProject =
    env.SENTRY_PROJECT || process.env.SENTRY_PROJECT || ""
  const sentryUrl = env.SENTRY_URL || process.env.SENTRY_URL || ""
  const sentryRelease =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    env.SENTRY_RELEASE ||
    process.env.SENTRY_RELEASE ||
    ""

  const uploadSourceMaps = Boolean(
    sentryAuthToken && sentryOrg && sentryProject,
  )

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Après les autres plugins ; upload + suppression des .map
      ...(uploadSourceMaps
        ? [
            sentryVitePlugin({
              org: sentryOrg,
              project: sentryProject,
              authToken: sentryAuthToken,
              ...(sentryUrl ? { url: sentryUrl } : {}),
              release: sentryRelease
                ? { name: sentryRelease, inject: true }
                : { inject: true },
              sourcemaps: {
                filesToDeleteAfterUpload: ["./dist/**/*.map"],
              },
              // Ne pas faire échouer le build Vercel si l’upload rate
              errorHandler: (err) => {
                console.warn("[sentry] source maps upload:", err.message)
              },
            }),
          ]
        : []),
    ],

    define: {
      __SENTRY_DSN__: JSON.stringify(sentryDsn),
    },

    build: {
      // "hidden" = génère les .map sans //# sourceMappingURL (pas d’exposition)
      sourcemap: uploadSourceMaps ? "hidden" : false,
    },

    optimizeDeps: {
      exclude: ["maplibre-gl"],
    },

    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
  }
})
