import { useEffect, useState } from "react"
import { loadStations } from "../services/stationsApi"
import type { Station } from "../types/station"

export function useStations() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const enriched = await loadStations({
          signal: controller.signal,
          onOfficial: (official) => {
            if (controller.signal.aborted) return
            setStations(official)
            setLoading(false)
          },
          onBrandsFresh: (fresh) => {
            if (!controller.signal.aborted) setStations(fresh)
          },
        })
        if (controller.signal.aborted) return
        setStations(enriched)
        setLoading(false)
      } catch (loadError) {
        if (controller.signal.aborted) return
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return
        }
        console.error("Impossible de charger les stations :", loadError)
        setError("Impossible de charger les stations.")
        setStations([])
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [reloadToken])

  function retry() {
    setReloadToken((token) => token + 1)
  }

  return { stations, loading, error, retry }
}
