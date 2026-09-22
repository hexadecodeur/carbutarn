/** Prix considéré comme périmé au-delà de 3 jours. */
export const STALE_PRICE_MS = 3 * 24 * 60 * 60 * 1000

export function isPriceStale(
  updatedAt: Date,
  nowMs: number = globalThis.Date.now(),
): boolean {
  return nowMs - updatedAt.getTime() > STALE_PRICE_MS
}
