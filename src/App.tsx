import { useEffect, useRef, useState } from "react"
import StationMap, { type StationMapHandle } from "./components/StationMap"
import { getStations } from "./services/fuelApi"
import type { Station } from "./types/station"
import StationDetails from "./components/StationDetails"

function App() {
  const mapRef = useRef<StationMapHandle>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleStations, setVisibleStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  useEffect(() => {
    getStations()
      .then((data) => {
        setStations(data)
      })
      .catch((error) => {
        console.error("Impossible de charger les stations :", error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <main className="relative h-dvh overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="shrink-0 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⛽</div>

            <div>
              <h1 className="text-lg font-bold leading-tight">CarbuTarn</h1>
              <p className="text-xs text-slate-500">
                Les prix du carburant autour de toi
              </p>
            </div>
          </div>

          {/* Recherche */}
          <div className="mt-3">
            <input
              type="search"
              placeholder="Rechercher une ville..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </header>

        {/* Carte */}
        <section className="relative h-[42%] shrink-0 bg-slate-300">
          <StationMap
            ref={mapRef}
            stations={stations}
            onVisibleStationsChange={setVisibleStations}
            onStationSelect={setSelectedStation}
          />

          <button
            onClick={() => mapRef.current?.locateUser()}
            className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-lg"
            aria-label="Me géolocaliser"
          >
            ◎
          </button>
        </section>

        {/* Partie stations */}
        <section className="flex min-h-0 flex-1 flex-col bg-white">
          {/* Filtres */}
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Stations à proximité</h2>

              <button className="text-sm font-medium text-slate-600">
                Trier ↕
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button className="whitespace-nowrap rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white">
                Distance
              </button>

              <button className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-medium">
                Gazole
              </button>

              <button className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-medium">
                E10
              </button>

              <button className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-medium">
                SP98
              </button>

              <button className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-medium">
                E85
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                Chargement des stations...
              </div>
            ) : visibleStations.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                Aucune station dans cette zone.
              </div>
            ) : (
              visibleStations.map((station) => {
                const diesel = station.fuels.find(
                  (fuel) => fuel.type === "Gazole",
                )

                const e10 = station.fuels.find((fuel) => fuel.type === "E10")

                return (
                  <button
                    key={station.id}
                    onClick={() => {
                      setSelectedStation(station)
                      mapRef.current?.focusStation(station.id)
                    }}
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                      ⛽
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">
                        Station-service
                      </h3>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {station.address}
                        {station.postalCode && ` · ${station.postalCode}`}
                        {station.city && ` ${station.city}`}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span>
                          <span className="text-xs text-slate-500">
                            Gazole{" "}
                          </span>

                          <strong>
                            {diesel ? `${diesel.price.toFixed(3)} €` : "—"}
                          </strong>
                        </span>

                        <span>
                          <span className="text-xs text-slate-500">E10 </span>

                          <strong>
                            {e10 ? `${e10.price.toFixed(3)} €` : "—"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <span className="text-xl text-slate-400">›</span>
                  </button>
                )
              })
            )}
          </div>
        </section>
      </div>
      {selectedStation && (
        <StationDetails
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </main>
  )
}

export default App
