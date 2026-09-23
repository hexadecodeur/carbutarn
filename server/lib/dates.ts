/** Sérialise une date Drizzle/Neon sans faire planter la route (Invalid Date, string, etc.). */
export function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date) {
    const time = value.getTime()
    if (Number.isNaN(time)) return null
    return value.toISOString()
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toISOString()
  }
  return null
}
