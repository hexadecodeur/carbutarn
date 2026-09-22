/** Vert (bas) → orange → rouge (haut), selon la position dans [min, max]. */
export function getPriceHeatColor(
  price: number,
  minPrice: number,
  maxPrice: number,
): string {
  if (maxPrice <= minPrice) {
    return "hsl(142 70% 38%)"
  }

  const t = Math.min(1, Math.max(0, (price - minPrice) / (maxPrice - minPrice)))

  // Teinte HSL : 142 (vert) → 45 (orange) → 0 (rouge)
  const hue = t < 0.5
    ? 142 - (142 - 45) * (t / 0.5)
    : 45 - 45 * ((t - 0.5) / 0.5)

  return `hsl(${Math.round(hue)} 78% 40%)`
}

export function getFuelPriceRange(
  prices: number[],
): { min: number; max: number } | null {
  if (prices.length === 0) return null

  let min = prices[0]
  let max = prices[0]

  for (let i = 1; i < prices.length; i++) {
    const price = prices[i]
    if (price < min) min = price
    if (price > max) max = price
  }

  return { min, max }
}
