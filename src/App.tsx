import { useEffect, useRef, useState } from "react"
import StationMap, { type StationMapHandle } from "./components/StationMap"
import { getStations } from "./services/fuelApi"
import type { Station } from "./types/station"
import StationDetails from "./components/StationDetails"
import { searchCities, type City } from "./services/cityApi"
import { getDistanceKm } from "./utils/distance"

type ReferenceLocation = {
  latitude: number
  longitude: number
}

function App() {
  const mapRef = useRef<StationMapHandle>(null)

  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleStations, setVisibleStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [citySuggestions, setCitySuggestions] = useState<City[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [referenceLocation, setReferenceLocation] =
    useState<ReferenceLocation | null>(null)

  const [selectedFuel, setSelectedFuel] = useState<
    "Distance" | "Gazole" | "E10" | "SP98" | "E85"
  >("Distance")

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

  useEffect(() => {
    const query = searchQuery.trim()

    if (query.length < 2) {
      setCitySuggestions([])
      return
    }

    const timeout = window.setTimeout(() => {
      searchCities(query)
        .then(setCitySuggestions)
        .catch((error) => {
          console.error("Recherche de commune impossible :", error)
          setCitySuggestions([])
        })
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchQuery])

  function selectCity(city: City) {
    setSearchQuery(city.name)
    setCitySuggestions([])
    setShowSuggestions(false)
    setSelectedStation(null)
    setReferenceLocation({
      latitude: city.latitude,
      longitude: city.longitude,
    })

    const nearestStation = stations
      .map((station) => ({
        station,
        distance: getDistanceKm(
          city.latitude,
          city.longitude,
          station.latitude,
          station.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0]

    if (!nearestStation) {
      mapRef.current?.focusLocation(
        city.longitude,
        city.latitude,
        12
      )
      return
    }

    mapRef.current?.focusArea(
      city.longitude,
      city.latitude,
      [nearestStation.station]
    )
  }

  const sortedVisibleStations = [...visibleStations]
    .map((station) => ({
      ...station,
      distance: referenceLocation
        ? getDistanceKm(
            referenceLocation.latitude,
            referenceLocation.longitude,
            station.latitude,
            station.longitude
          )
        : undefined,
    }))
    .sort((a, b) => {
      // Tri par distance
      if (selectedFuel === "Distance") {
        if (a.distance === undefined && b.distance === undefined) return 0
        if (a.distance === undefined) return 1
        if (b.distance === undefined) return -1

        return a.distance - b.distance
      }

      // Tri par prix
      const priceA = a.fuels.find(
        (fuel) => fuel.type === selectedFuel
      )?.price

      const priceB = b.fuels.find(
        (fuel) => fuel.type === selectedFuel
      )?.price

      // Les stations sans ce carburant vont à la fin
      if (priceA === undefined && priceB === undefined) return 0
      if (priceA === undefined) return 1
      if (priceB === undefined) return -1

      return priceA - priceB
    })

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
          <div className="relative mt-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Rechercher une ville..."
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />

            {showSuggestions && citySuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {citySuggestions.map((city) => (
                  <button
                    key={`${city.name}-${city.postalCodes.join("-")}`}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span>📍</span>

                      <span className="font-medium">
                        {city.name}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500">
                      {city.postalCodes.join(", ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Carte */}
        <section className="relative h-[42%] shrink-0 bg-slate-300">
          <StationMap
            ref={mapRef}
            stations={stations}
            onVisibleStationsChange={setVisibleStations}
            onStationSelect={setSelectedStation}
            onUserLocationChange={(latitude, longitude) => {
              setReferenceLocation({
                latitude,
                longitude,
              })

              setSearchQuery("")
            }}
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
              <button
                onClick={() => setSelectedFuel("Distance")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium ${
                  selectedFuel === "Distance"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                Distance
              </button>

              <button
                onClick={() => setSelectedFuel("Gazole")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium ${
                  selectedFuel === "Gazole"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                Gazole
              </button>

              <button
                onClick={() => setSelectedFuel("E10")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium ${
                  selectedFuel === "E10"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                E10
              </button>

              <button
                onClick={() => setSelectedFuel("SP98")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium ${
                  selectedFuel === "SP98"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                SP98
              </button>

              <button
                onClick={() => setSelectedFuel("E85")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium ${
                  selectedFuel === "E85"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
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
    sortedVisibleStations.map((station) => {
      const diesel = station.fuels.find(
        (fuel) => fuel.type === "Gazole"
      )

      const e10 = station.fuels.find(
        (fuel) => fuel.type === "E10"
      )

      const sp98 = station.fuels.find(
        (fuel) => fuel.type === "SP98"
      )

      const e85 = station.fuels.find(
        (fuel) => fuel.type === "E85"
      )

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

            {station.distance !== undefined && (
              <p className="mt-1 text-xs font-medium text-slate-600">
                {station.distance < 1
                  ? `${Math.round(station.distance * 1000)} m`
                  : `${station.distance.toFixed(1)} km`}
              </p>
            )}

            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:flex sm:flex-wrap">
              <span>
                <span className="text-xs text-slate-500">
                  Gazole{" "}
                </span>
                <strong>
                  {diesel
                    ? `${diesel.price.toFixed(3)} €`
                    : "—"}
                </strong>
              </span>

              <span>
                <span className="text-xs text-slate-500">
                  E10{" "}
                </span>
                <strong>
                  {e10
                    ? `${e10.price.toFixed(3)} €`
                    : "—"}
                </strong>
              </span>

              <span>
                <span className="text-xs text-slate-500">
                  SP98{" "}
                </span>
                <strong>
                  {sp98
                    ? `${sp98.price.toFixed(3)} €`
                    : "—"}
                </strong>
              </span>

              <span>
                <span className="text-xs text-slate-500">
                  E85{" "}
                </span>
                <strong>
                  {e85
                    ? `${e85.price.toFixed(3)} €`
                    : "—"}
                </strong>
              </span>
            </div>
          </div>

          <span className="text-xl text-slate-400">
            ›
          </span>
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
