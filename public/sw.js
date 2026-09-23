/* CarbuTarn — SW minimal (installabilité PWA / prérequis TWA).
 * Pas de cache agressif : l’API et la carte doivent rester réseau.
 */
const VERSION = "carbutarn-sw-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith("carbutarn-") && key !== VERSION)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ne jamais intercepter l’API ni les tuiles carte
  if (url.pathname.startsWith("/api/")) return
  if (
    url.hostname.includes("maptiler.com") ||
    url.hostname.includes("cartocdn.com")
  ) {
    return
  }

  // Navigation : network-first, fallback offline minimal
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          const cached = await caches.match("/")
          if (cached) return cached
          return new Response(
            "<!doctype html><title>CarbuTarn</title><p>Hors ligne — reconnecte-toi.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          )
        }
      })(),
    )
  }
})
