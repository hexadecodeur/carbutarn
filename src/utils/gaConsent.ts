const STORAGE_KEY = "carbutarn:ga-consent"
export const GA_MEASUREMENT_ID = "G-LP366B3KCB"

export type GaConsent = "accepted" | "refused"

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let scriptRequested = false

export function loadGaConsent(): GaConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === "accepted" || raw === "refused") return raw
  } catch {
    /* ignore */
  }
  return null
}

export function saveGaConsent(value: GaConsent): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
}

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args)
    }
  }
}

/** Charge gtag.js uniquement après consentement explicite. */
export function enableGoogleAnalytics() {
  ensureGtagStub()
  window.gtag?.("js", new Date())
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
  })

  if (scriptRequested) return
  if (document.querySelector(`script[data-ga="${GA_MEASUREMENT_ID}"]`)) {
    scriptRequested = true
    return
  }

  scriptRequested = true
  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  script.dataset.ga = GA_MEASUREMENT_ID
  document.head.appendChild(script)
}

export function applyGaConsent(value: GaConsent) {
  saveGaConsent(value)
  if (value === "accepted") {
    enableGoogleAnalytics()
    return
  }
  // Refus : ne pas charger le script. Si déjà chargé, couper le stockage analytics.
  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
    })
  }
}
