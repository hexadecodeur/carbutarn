export type FuelType = "Gazole" | "SP95" | "E10" | "SP98" | "E85" | "GPLc"

export type FuelPrice = {
  type: FuelType
  price: number
  updatedAt: string | null
}

export type Station = {
  id: string

  latitude: number
  longitude: number

  address: string
  city: string
  postalCode: string

  fuels: FuelPrice[]

  services: string[]
  openingHours: string | null

  distance?: number
}
