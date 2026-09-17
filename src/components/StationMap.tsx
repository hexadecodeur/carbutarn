import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import type { Station } from "../types/station"

export type StationMapHandle = {
  locateUser: () => void
  focusStation: (stationId: string) => void
}

type StationMapProps = {
  stations: Station[]
  onVisibleStationsChange?: (stations: Station[]) => void
  onStationSelect?: (station: Station) => void
}

const StationMap = forwardRef<StationMapHandle, StationMapProps>(
  function StationMap(
    { stations, onVisibleStationsChange, onStationSelect },
    ref,
  ) {
    const mapContainer = useRef<HTMLDivElement | null>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const userMarker = useRef<maplibregl.Marker | null>(null)
    const stationMarkers = useRef<Map<string, maplibregl.Marker>>(new Map())

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

      return () => {
        userMarker.current?.remove()
        map.current?.remove()
        map.current = null
      }
    }, [])

    useEffect(() => {
      if (!map.current) return

      const currentMap = map.current

      const updateVisibleStations = () => {
        const bounds = currentMap.getBounds()

        const visibleStations = stations.filter((station) =>
          bounds.contains([station.longitude, station.latitude]),
        )

        onVisibleStationsChange?.(visibleStations)
      }

      currentMap.on("load", updateVisibleStations)
      currentMap.on("moveend", updateVisibleStations)
      currentMap.on("zoomend", updateVisibleStations)

      // Cas où la carte est déjà chargée
      if (currentMap.loaded()) {
        updateVisibleStations()
      }

      return () => {
        currentMap.off("load", updateVisibleStations)
        currentMap.off("moveend", updateVisibleStations)
        currentMap.off("zoomend", updateVisibleStations)
      }
    }, [stations, onVisibleStationsChange])

    useEffect(() => {
      if (!map.current) return

      // Supprime les anciens marqueurs
      stationMarkers.current.forEach((marker) => marker.remove())
      stationMarkers.current.clear()

      stations.forEach((station) => {
        const marker = new maplibregl.Marker({
          color: "#dc2626",
        })
          .setLngLat([station.longitude, station.latitude])
          .addTo(map.current!)

        marker.getElement().addEventListener("click", () => {
          if (!map.current) return

          onStationSelect?.(station)

          map.current.flyTo({
            center: [station.longitude, station.latitude],
            zoom: Math.max(map.current.getZoom(), 15),
            essential: true,
          })
        })

        stationMarkers.current.set(station.id, marker)
      })

      return () => {
        stationMarkers.current.forEach((marker) => marker.remove())
        stationMarkers.current.clear()
      }
    }, [stations, onStationSelect])

    useImperativeHandle(ref, () => ({
      locateUser() {
        if (!window.isSecureContext) {
          alert(
            "La géolocalisation nécessite une connexion HTTPS. Elle sera disponible sur la version en ligne de CarbuTarn.",
          )
          return
        }

        if (!navigator.geolocation) {
          alert("La géolocalisation n'est pas disponible sur cet appareil.")
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const longitude = position.coords.longitude
            const latitude = position.coords.latitude

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
              alert(
                "La géolocalisation a été refusée. La carte reste centrée sur Albi.",
              )
              return
            }

            alert(
              "Impossible de récupérer ta position. La carte reste centrée sur Albi.",
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
        const marker = stationMarkers.current.get(stationId)

        if (!marker || !map.current) return

        const position = marker.getLngLat()

        map.current.flyTo({
          center: position,
          zoom: 15,
          essential: true,
        })
      },
    }))

    return <div ref={mapContainer} className="h-full w-full" />
  },
)

export default StationMap
