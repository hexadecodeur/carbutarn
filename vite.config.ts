import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => {
  // Préfixe vide : lit aussi SENTRY_DSN (sans VITE_) depuis .env* / process.env (Vercel)
  const env = loadEnv(mode, process.cwd(), "")
  const sentryDsn = env.SENTRY_DSN || process.env.SENTRY_DSN || ""

  return {
    plugins: [react(), tailwindcss()],

    define: {
      __SENTRY_DSN__: JSON.stringify(sentryDsn),
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
