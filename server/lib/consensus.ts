/**
 * Consensus prix constatés :
 * - groupe = fenêtre de prix de diamètre ≤ CONSENSUS_PRICE_EPSILON (€/L)
 * - publication si poids effectif du meilleur groupe ≥ MIN_CONSENSUS_WEIGHT
 * - médiane pondérée réelle du groupe (pas d’arrondi forcé au centime)
 */

export const CONSENSUS_PRICE_EPSILON = 0.01
/** Consensus prix (OK / correction). */
export const MIN_CONSENSUS_WEIGHT = 3
/** Consensus rupture de stock. */
export const MIN_OUTAGE_WEIGHT = 4

export type ConsensusSample = { value: number; weight: number }

export function totalWeight(samples: ConsensusSample[]): number {
  return samples.reduce((sum, sample) => sum + sample.weight, 0)
}

/**
 * Médiane pondérée : chaque valeur est répétée round(weight) fois (min 1).
 */
export function weightedMedian(samples: ConsensusSample[]): number | null {
  if (samples.length === 0) return null

  const expanded: number[] = []
  for (const sample of samples) {
    const copies = Math.max(1, Math.round(sample.weight))
    for (let i = 0; i < copies; i++) {
      expanded.push(sample.value)
    }
  }

  expanded.sort((a, b) => a - b)
  const mid = Math.floor(expanded.length / 2)
  if (expanded.length % 2 === 0) {
    return (expanded[mid - 1]! + expanded[mid]!) / 2
  }
  return expanded[mid]!
}

/** Deux prix sont compatibles s’ils diffèrent d’au plus epsilon. */
export function pricesCompatible(
  a: number,
  b: number,
  epsilon = CONSENSUS_PRICE_EPSILON,
): boolean {
  return Math.abs(a - b) <= epsilon + Number.EPSILON
}

/**
 * Meilleur groupe = fenêtre triée de diamètre ≤ epsilon maximisant le poids.
 * Ex. 1,990 / 1,995 / 2,000 → un groupe ; 2,001 hors groupe avec 1,990.
 */
export function bestConsensusCluster(
  samples: ConsensusSample[],
  epsilon = CONSENSUS_PRICE_EPSILON,
): ConsensusSample[] {
  if (samples.length === 0) return []

  const sorted = [...samples].sort((a, b) => a.value - b.value)
  let best: ConsensusSample[] = []
  let bestWeight = -1

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i; j < sorted.length; j++) {
      if (sorted[j]!.value - sorted[i]!.value > epsilon + Number.EPSILON) break
      const window = sorted.slice(i, j + 1)
      const weight = totalWeight(window)
      if (
        weight > bestWeight ||
        (weight === bestWeight && window.length > best.length)
      ) {
        bestWeight = weight
        best = window
      }
    }
  }

  return best
}

export type ConsensusResult = {
  price: number
  /** Poids effectif du groupe retenu (proche = 2, sinon 1). */
  sampleCount: number
  published: boolean
}

export function computeConsensus(
  samples: ConsensusSample[],
  options?: {
    epsilon?: number
    minWeight?: number
  },
): ConsensusResult | null {
  const cluster = bestConsensusCluster(
    samples,
    options?.epsilon ?? CONSENSUS_PRICE_EPSILON,
  )
  if (cluster.length === 0) return null

  const price = weightedMedian(cluster)
  if (price == null) return null

  const sampleCount = totalWeight(cluster)
  const minWeight = options?.minWeight ?? MIN_CONSENSUS_WEIGHT

  return {
    price,
    sampleCount,
    published: sampleCount >= minWeight,
  }
}
