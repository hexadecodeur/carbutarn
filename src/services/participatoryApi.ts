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
    published: boolean
    price?: number
    sampleCount?: number
    computedAt?: string
  }[]
  viewer: {
    authenticated: boolean
    canReport: boolean
    reportedFuelTypes: string[]
    lastReportAt?: string
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
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
    const error = new Error(body?.error ?? `API ${response.status}`) as Error & {
      status?: number
    }
    error.status = response.status
    throw error
  }

  return response.json() as Promise<T>
}

export async function fetchTurnstileSiteKey(): Promise<string | null> {
  const response = await fetch("/api/auth/turnstile")
  if (!response.ok) return null
  const data = (await response.json()) as { siteKey?: string | null }
  const key = data.siteKey?.trim()
  return key || null
}

export function requestMagicLink(email: string, turnstileToken?: string) {
  return api<{ ok: true }>("/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email, turnstileToken }),
  })
}

export function verifyMagicLink(token: string) {
  return api<{ ok: true; user: { id: string; email: string } }>(
    "/auth/verify",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  )
}

export async function fetchMe(): Promise<{
  user: { id: string; email: string } | null
}> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  })

  // Session cookie invalide → 401 + cookie effacé côté serveur
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

export function deleteAccount() {
  return api<{ ok: true }>("/auth/account", { method: "DELETE" })
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

export type MyReport = {
  id: string
  stationId: string
  fuelType: string
  agreed: boolean
  price: number | null
  createdAt: string
  station: {
    address: string | null
    city: string | null
    postalCode: string | null
  }
}

export function fetchMyReports() {
  return api<{ reports: MyReport[] }>("/auth/reports")
}
