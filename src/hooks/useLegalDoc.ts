import { useEffect, useState } from "react"
import type { LegalDocId } from "../content/legal"

const LEGAL_HASHES: Record<LegalDocId, string> = {
  mentions: "mentions-legales",
  confidentialite: "confidentialite",
  cgu: "cgu",
}

function legalIdFromHash(hash: string): LegalDocId | null {
  const value = hash.replace(/^#/, "")
  const entry = Object.entries(LEGAL_HASHES).find(([, h]) => h === value)
  return (entry?.[0] as LegalDocId | undefined) ?? null
}

export function useLegalDoc() {
  const [legalDocId, setLegalDocId] = useState<LegalDocId | null>(() =>
    typeof window !== "undefined"
      ? legalIdFromHash(window.location.hash)
      : null,
  )

  useEffect(() => {
    function syncLegalFromUrl() {
      setLegalDocId(legalIdFromHash(window.location.hash))
    }

    window.addEventListener("hashchange", syncLegalFromUrl)
    window.addEventListener("popstate", syncLegalFromUrl)
    return () => {
      window.removeEventListener("hashchange", syncLegalFromUrl)
      window.removeEventListener("popstate", syncLegalFromUrl)
    }
  }, [])

  function openLegal(id: LegalDocId) {
    setLegalDocId(id)
    const nextHash = `#${LEGAL_HASHES[id]}`
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash)
    }
  }

  function closeLegal() {
    setLegalDocId(null)
    if (legalIdFromHash(window.location.hash)) {
      window.history.pushState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      )
    }
  }

  return { legalDocId, openLegal, closeLegal }
}
