export type AppEnv = {
  Variables: {
    userId?: string
    userEmail?: string
  }
}

export type FuelTypeApi =
  | "Gazole"
  | "SP95"
  | "E10"
  | "SP98"
  | "E85"
  | "GPLc"

export const FUEL_TYPES: FuelTypeApi[] = [
  "Gazole",
  "SP95",
  "E10",
  "SP98",
  "E85",
  "GPLc",
]
