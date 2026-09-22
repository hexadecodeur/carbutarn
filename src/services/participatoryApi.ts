/**
 * Client HTTP Phase 2 — contributions / auth.
 * Same-origin `/api` (Vite proxy en local, Vercel en prod).
 */
import type { FuelType } from "../types/station"

export type StationPricesResponse = {
  stationId: string
  official: { type: string; price: number; updatedAt: string | null }[]
  observed: {
    type: string
    price: number
    sampleCount: number
    computedAt: string
    published: boolean
  }[]
  viewer: {
    authenticated: boolean
    canReport: boolean
    reportedFuelTypes: string[]
    lastReportAt?: string
  }
}

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? `API ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function requestMagicLink(email: string) {
  return api<{ ok: true }>("/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function fetchMe(): Promise<{
  user: { id: string; email: string } | null
}> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  })

  if (response.status === 401) {
    return { user: null }
  }

  if (!response.ok) {
    throw new Error(`API ${response.status}`)
  }

  return response.json() as Promise<{
    user: { id: string; email: string } | null
  }>
}

export function logout() {
  return api<{ ok: true }>("/auth/logout", { method: "POST" })
}

export function fetchStationPrices(stationId: string) {
  return api<StationPricesResponse>(
    `/stations/${encodeURIComponent(stationId)}/prices`,
  )
}

export function submitReport(
  stationId: string,
  payload: {
    fuelType: FuelType
    agreed: boolean
    price?: number
    lat?: number
    lon?: number
  },
) {
  return api<{ ok: true }>(
    `/stations/${encodeURIComponent(stationId)}/reports`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  )
}
