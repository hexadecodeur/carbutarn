/**
 * Médiane pondérée simple : chaque valeur est répétée selon
 * round(weight * 2) occurrences (min 1), puis médiane classique.
 */
export function weightedMedian(
  samples: { value: number; weight: number }[],
): number | null {
  if (samples.length === 0) return null

  const expanded: number[] = []
  for (const sample of samples) {
    const copies = Math.max(1, Math.round(sample.weight * 2))
    for (let i = 0; i < copies; i++) {
      expanded.push(sample.value)
    }
  }

  expanded.sort((a, b) => a - b)
  const mid = Math.floor(expanded.length / 2)
  if (expanded.length % 2 === 0) {
    return (expanded[mid - 1] + expanded[mid]) / 2
  }
  return expanded[mid]
}
