import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import type { ListFuelType, Station } from "../types/station"
import { getFuelPriceRange, getPriceHeatColor } from "../utils/priceColor"

export type StationMapHandle = {
  locateUser: () => void

  focusStation: (stationId: string) => void

  focusLocation: (
    longitude: number,
    latitude: number,
    zoom?: number
  ) => void

  focusArea: (
    longitude: number,
    latitude: number,
    stations: Station[]
  ) => void
}

type StationMapProps = {
  stations: Station[]
  selectedFuel: ListFuelType | null
  selectedStationId?: string | null
  onStationSelect?: (station: Station) => void
  onUserLocationChange?: (
    latitude: number,
    longitude: number
  ) => void
  /** Remplace les alert() navigateur pour les retours géoloc */
  onLocateStatus?: (message: string | null) => void
}

const StationMap = forwardRef<StationMapHandle, StationMapProps>(
  function StationMap(
    {
      stations,
      selectedFuel,
      selectedStationId = null,
      onStationSelect,
      onUserLocationChange,
      onLocateStatus,
    },
    ref,
  ) {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const userMarker = useRef<maplibregl.Marker | null>(null)
    const stationMarkers = useRef<Map<string, maplibregl.Marker>>(new Map())
    const stationsRef = useRef(stations)
    stationsRef.current = stations
    const onLocateStatusRef = useRef(onLocateStatus)
    const onUserLocationChangeRef = useRef(onUserLocationChange)

    useEffect(() => {
      onLocateStatusRef.current = onLocateStatus
    }, [onLocateStatus])

    useEffect(() => {
      onUserLocationChangeRef.current = onUserLocationChange
    }, [onUserLocationChange])

    useEffect(() => {
      if (!mapContainer.current || map.current) return

      map.current = new maplibregl.Map({
        container: mapContainer.current,

        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },

        center: [2.148, 43.9298],
        zoom: 12,
      })

      map.current.addControl(new maplibregl.NavigationControl(), "top-right")

      const resizeObserver = new ResizeObserver(() => {
        map.current?.resize()
      })
      resizeObserver.observe(mapContainer.current)

      return () => {
        resizeObserver.disconnect()
        userMarker.current?.remove()
        map.current?.remove()
        map.current = null
      }
    }, [])

    useEffect(() => {
      if (!map.current) return

      const markers = stationMarkers.current
      markers.forEach((marker) => marker.remove())
      markers.clear()

      const fuelPrices =
        selectedFuel === null
          ? []
          : stations
              .map(
                (station) =>
                  station.fuels.find((fuel) => fuel.type === selectedFuel)
                    ?.price,
              )
              .filter((price): price is number => price !== undefined)

      const priceRange = getFuelPriceRange(fuelPrices)

      stations.forEach((station) => {
        let marker: maplibregl.Marker
        const isSelected = station.id === selectedStationId

        if (selectedFuel === null) {
          marker = new maplibregl.Marker({
            color: isSelected ? "#e09b1b" : "#1f5c52",
          })
            .setLngLat([station.longitude, station.latitude])
            .addTo(map.current!)
        } else {
          const fuel = station.fuels.find((f) => f.type === selectedFuel)

          if (fuel && priceRange) {
            const background = getPriceHeatColor(
              fuel.price,
              priceRange.min,
              priceRange.max,
            )

            const element = document.createElement("div")

            element.className = isSelected
              ? "cursor-pointer rounded-md border-2 border-amber px-2 py-1 font-[Figtree] text-xs font-bold tracking-tight text-white shadow-sm ring-2 ring-amber/40"
              : "cursor-pointer rounded-md border border-white/40 px-2 py-1 font-[Figtree] text-xs font-bold tracking-tight text-white shadow-sm"

            element.style.backgroundColor = background
            element.textContent = `${fuel.price.toFixed(3)} €`

            marker = new maplibregl.Marker({
              element,
              anchor: "bottom",
            })
              .setLngLat([station.longitude, station.latitude])
              .addTo(map.current!)
          } else if (isSelected) {
            marker = new maplibregl.Marker({
              color: "#e09b1b",
            })
              .setLngLat([station.longitude, station.latitude])
              .addTo(map.current!)
          } else {
            return
          }
        }

        marker.getElement().addEventListener("click", () => {
          if (!map.current) return

          onStationSelect?.(station)

          map.current.flyTo({
            center: [station.longitude, station.latitude],
            zoom: Math.max(map.current.getZoom(), 15),
            essential: true,
          })
        })

        markers.set(station.id, marker)
      })

      return () => {
        markers.forEach((marker) => marker.remove())
        markers.clear()
      }
    }, [stations, onStationSelect, selectedFuel, selectedStationId])

    useImperativeHandle(ref, () => ({
      locateUser() {
        const report = (message: string | null) => {
          onLocateStatusRef.current?.(message)
        }

        if (!window.isSecureContext) {
          report(
            "La géolocalisation nécessite HTTPS. Elle sera dispo sur la version en ligne.",
          )
          return
        }

        if (!navigator.geolocation) {
          report("La géolocalisation n’est pas disponible sur cet appareil.")
          return
        }

        report(null)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const longitude = position.coords.longitude
            const latitude = position.coords.latitude
            onUserLocationChangeRef.current?.(latitude, longitude)
            if (!map.current) return

            userMarker.current?.remove()

            userMarker.current = new maplibregl.Marker({
              color: "#2563eb",
            })
              .setLngLat([longitude, latitude])
              .addTo(map.current)

            map.current.flyTo({
              center: [longitude, latitude],
              zoom: 14,
              essential: true,
            })
          },

          (error) => {
            console.error("Erreur de géolocalisation :", error)

            if (error.code === error.PERMISSION_DENIED) {
              report(
                "Géolocalisation refusée. Cherche une ville ou déplace la carte.",
              )
              return
            }

            report(
              "Impossible de récupérer ta position. Cherche une ville ou déplace la carte.",
            )
          },

          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          },
        )
      },

      focusStation(stationId: string) {
        if (!map.current) return

        const marker = stationMarkers.current.get(stationId)
        if (marker) {
          map.current.flyTo({
            center: marker.getLngLat(),
            zoom: 15,
            essential: true,
          })
          return
        }

        const station = stationsRef.current.find((s) => s.id === stationId)
        if (!station) return

        map.current.flyTo({
          center: [station.longitude, station.latitude],
          zoom: 15,
          essential: true,
        })
      },

      focusLocation(
        longitude: number,
        latitude: number,
        zoom = 13
      ) {
        if (!map.current) return

        map.current.flyTo({
          center: [longitude, latitude],
          zoom,
          essential: true,
        })
      },

      focusArea(
        longitude: number,
        latitude: number,
        stations: Station[]
      ) {
        if (!map.current) return

        const bounds = new maplibregl.LngLatBounds()

        bounds.extend([longitude, latitude])

        stations.forEach((station) => {
          bounds.extend([
            station.longitude,
            station.latitude,
          ])
        })

        map.current.fitBounds(bounds, {
          padding: 60,
          maxZoom: 13,
          duration: 1000,
        })
      },
    }))

    return <div ref={mapContainer} className="h-full w-full" />
  },
)

export default StationMap
