import { useEffect, useState } from "react"
import {
  deleteAccount as apiDeleteAccount,
  fetchMe,
  logout as apiLogout,
  requestMagicLink as apiRequestMagicLink,
  verifyMagicLink,
} from "../services/participatoryApi"

export type AuthUser = {
  id: string
  email: string
}

export type AuthFlash = "ok" | "error" | null

function clearAuthHash() {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  )
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [flash, setFlash] = useState<AuthFlash>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const { user: next } = await fetchMe()
        if (!cancelled) setUser(next)
      } catch (error) {
        console.error("Session impossible à charger :", error)
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSession()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function handleHash() {
      const hash = window.location.hash.replace(/^#/, "")

      const tokenMatch = hash.match(/^connexion-token=(.+)$/)
      if (tokenMatch?.[1]) {
        const raw = decodeURIComponent(tokenMatch[1])
        clearAuthHash()
        try {
          const result = await verifyMagicLink(raw)
          if (cancelled) return
          setUser(result.user)
          setFlash("ok")
          setAuthOpen(false)
        } catch {
          if (cancelled) return
          setFlash("error")
          setAuthOpen(true)
        }
        return
      }

      if (hash === "connexion-ok") {
        setFlash("ok")
        clearAuthHash()
        void fetchMe()
          .then(({ user: next }) => {
            if (!cancelled) setUser(next)
          })
          .catch(() => {
            if (!cancelled) setUser(null)
          })
          .finally(() => {
            if (!cancelled) setAuthOpen(false)
          })
        return
      }

      if (hash === "connexion-erreur") {
        setFlash("error")
        clearAuthHash()
        setAuthOpen(true)
      }
    }

    void handleHash()
    window.addEventListener("hashchange", handleHash)
    return () => {
      cancelled = true
      window.removeEventListener("hashchange", handleHash)
    }
  }, [])

  useEffect(() => {
    if (!flash) return
    const timeout = window.setTimeout(() => setFlash(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [flash])

  function openAuth() {
    setAuthOpen(true)
  }

  function closeAuth() {
    setAuthOpen(false)
  }

  async function requestMagicLink(email: string, turnstileToken?: string) {
    await apiRequestMagicLink(email, turnstileToken)
  }

  async function logout() {
    try {
      await apiLogout()
    } catch (error) {
      console.error("Déconnexion impossible :", error)
    } finally {
      setUser(null)
    }
  }

  /** Cookie déjà invalidé côté serveur (401) — aligner l’UI sans rappeler /logout. */
  function clearSession() {
    setUser(null)
  }

  async function deleteAccount() {
    await apiDeleteAccount()
    setUser(null)
    setAuthOpen(false)
  }

  return {
    user,
    loading,
    authOpen,
    flash,
    openAuth,
    closeAuth,
    requestMagicLink,
    logout,
    clearSession,
    deleteAccount,
    clearFlash: () => setFlash(null),
  }
}
