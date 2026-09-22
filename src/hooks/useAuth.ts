import { useEffect, useState } from "react"
import {
  fetchMe,
  logout as apiLogout,
  requestMagicLink as apiRequestMagicLink,
} from "../services/participatoryApi"

export type AuthUser = {
  id: string
  email: string
}

export type AuthFlash = "ok" | "error" | null

function clearAuthHash() {
  const hash = window.location.hash.replace(/^#/, "")
  if (hash === "connexion-ok" || hash === "connexion-erreur") {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    )
  }
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
    function handleHash() {
      const hash = window.location.hash.replace(/^#/, "")
      if (hash === "connexion-ok") {
        setFlash("ok")
        clearAuthHash()
        void fetchMe()
          .then(({ user: next }) => setUser(next))
          .catch(() => setUser(null))
          .finally(() => setAuthOpen(false))
        return
      }
      if (hash === "connexion-erreur") {
        setFlash("error")
        clearAuthHash()
        setAuthOpen(true)
      }
    }

    handleHash()
    window.addEventListener("hashchange", handleHash)
    return () => window.removeEventListener("hashchange", handleHash)
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

  async function requestMagicLink(email: string) {
    await apiRequestMagicLink(email)
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

  return {
    user,
    loading,
    authOpen,
    flash,
    openAuth,
    closeAuth,
    requestMagicLink,
    logout,
    clearFlash: () => setFlash(null),
  }
}
