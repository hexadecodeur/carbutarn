/**
 * Chargement unique du script Turnstile (explicit render).
 * Évite les doubles injections et les listeners `load` perdus après StrictMode.
 */

export type TurnstileApi = {
  render: (
    container: HTMLElement | string,
    options: {
      sitekey: string
      callback?: (token: string) => void
      "expired-callback"?: () => void
      "error-callback"?: () => void
      theme?: "light" | "dark" | "auto"
    },
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
  ready?: (callback: () => void) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_ATTR = "data-carbutarn-turnstile"
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let loadPromise: Promise<TurnstileApi> | null = null

export function loadTurnstileApi(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile requires a browser"))
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile)
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const finish = () => {
      if (window.turnstile) {
        resolve(window.turnstile)
        return
      }
      reject(new Error("Turnstile API missing after script load"))
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[${SCRIPT_ATTR}="1"]`,
    )

    if (existing) {
      if (window.turnstile) {
        finish()
        return
      }
      existing.addEventListener("load", finish, { once: true })
      existing.addEventListener(
        "error",
        () => {
          loadPromise = null
          reject(new Error("Turnstile script failed to load"))
        },
        { once: true },
      )
      // Script déjà exécuté mais turnstile pas encore exposé : poll court
      let attempts = 0
      const poll = window.setInterval(() => {
        attempts += 1
        if (window.turnstile) {
          window.clearInterval(poll)
          finish()
        } else if (attempts > 50) {
          window.clearInterval(poll)
        }
      }, 50)
      return
    }

    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.setAttribute(SCRIPT_ATTR, "1")
    script.addEventListener("load", finish, { once: true })
    script.addEventListener(
      "error",
      () => {
        loadPromise = null
        reject(new Error("Turnstile script failed to load"))
      },
      { once: true },
    )
    document.head.appendChild(script)
  })

  return loadPromise
}
