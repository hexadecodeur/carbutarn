/** Fourchette anti-abus vs prix officiel (correction « Pas d’accord »). */
export const PRICE_TOLERANCE = 0.1
export const REPORT_COOLDOWN_MS = 2 * 60 * 60 * 1000
export const CONSENSUS_WINDOW_MS = 48 * 60 * 60 * 1000

export function isPriceInTolerance(
  reported: number,
  official: number,
  tolerance = PRICE_TOLERANCE,
): boolean {
  if (official <= 0 || reported <= 0) return false
  if (!Number.isFinite(reported) || !Number.isFinite(official)) return false
  const low = official * (1 - tolerance)
  const high = official * (1 + tolerance)
  return reported >= low && reported <= high
}

/**
 * Poids d’un signalement.
 * Le GPS client n’est plus crédité (spoofable) → poids fixe 1.
 * Un boost géofence reviendra avec attestation appareil (V2).
 */
export function reportWeight(): number {
  return 1
}

export function cooldownBucket(nowMs = Date.now()): number {
  return Math.floor(nowMs / REPORT_COOLDOWN_MS)
}
