/** Distance haversine en km (copie légère pour le serveur). */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const PRICE_TOLERANCE = 0.15
export const GEOFENCE_KM = 0.3
export const GEOFENCE_BOOST = 1.5
export const REPORT_COOLDOWN_MS = 2 * 60 * 60 * 1000
export const CONSENSUS_WINDOW_MS = 48 * 60 * 60 * 1000
export const MIN_SAMPLES_TO_DISPLAY = 2

export function isPriceInTolerance(
  reported: number,
  official: number,
  tolerance = PRICE_TOLERANCE,
): boolean {
  if (official <= 0 || reported <= 0) return false
  const low = official * (1 - tolerance)
  const high = official * (1 + tolerance)
  return reported >= low && reported <= high
}

export function reportWeight(options: {
  stationLat: number
  stationLon: number
  userLat?: number | null
  userLon?: number | null
}): number {
  const { stationLat, stationLon, userLat, userLon } = options
  if (
    typeof userLat !== "number" ||
    typeof userLon !== "number" ||
    Number.isNaN(userLat) ||
    Number.isNaN(userLon)
  ) {
    return 1
  }

  const km = distanceKm(stationLat, stationLon, userLat, userLon)
  return km <= GEOFENCE_KM ? GEOFENCE_BOOST : 1
}
