type DirectionsStation = {
  latitude: number
  longitude: number
  name?: string
  brand?: string | null
  address?: string
  postalCode?: string
  city?: string
}

type Origin = {
  latitude: number
  longitude: number
}

/**
 * Destination textuelle pour que Maps accroche le POI (enseigne),
 * plutôt qu’un point GPS Open Data parfois décalé de quelques dizaines de mètres.
 */
function getPlaceDestination(station: DirectionsStation): string | null {
  const placeName = station.brand || station.name
  const addressParts = [
    station.address && station.address !== "Adresse inconnue"
      ? station.address
      : null,
    [station.postalCode, station.city].filter(Boolean).join(" "),
  ].filter(Boolean)

  if (placeName && addressParts.length > 0) {
    return `${placeName}, ${addressParts.join(", ")}`
  }

  if (addressParts.length > 0) {
    return addressParts.join(", ")
  }

  if (placeName) return placeName

  return null
}

function getCoordDestination(station: DirectionsStation): string {
  return `${station.latitude},${station.longitude}`
}

/** Construit une URL d’itinéraire vers la station (Maps / Google Maps). */
export function getDirectionsUrl(
  station: DirectionsStation,
  origin?: Origin | null,
): string {
  const place = getPlaceDestination(station)
  const destination = place ?? getCoordDestination(station)

  const isApple =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent)

  if (isApple) {
    const params = new URLSearchParams({
      daddr: destination,
      dirflg: "d",
    })
    if (origin) {
      params.set("saddr", `${origin.latitude},${origin.longitude}`)
    }
    return `https://maps.apple.com/?${params}`
  }

  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  })
  if (origin) {
    params.set("origin", `${origin.latitude},${origin.longitude}`)
  }
  return `https://www.google.com/maps/dir/?${params}`
}

export function openDirections(
  station: DirectionsStation,
  origin?: Origin | null,
) {
  window.open(getDirectionsUrl(station, origin), "_blank", "noopener,noreferrer")
}
