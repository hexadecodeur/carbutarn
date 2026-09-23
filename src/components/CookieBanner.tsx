import { useEffect, useState } from "react"
import {
  applyGaConsent,
  enableGoogleAnalytics,
  loadGaConsent,
  type GaConsent,
} from "../utils/gaConsent"

type CookieBannerProps = {
  onOpenPrivacy: () => void
  /** Réaffiche le bandeau (choix Cookies dans le footer) */
  reopenToken?: number
}

function CookieBanner({ onOpenPrivacy, reopenToken = 0 }: CookieBannerProps) {
  const [choice, setChoice] = useState<GaConsent | null>(() =>
    typeof window !== "undefined" ? loadGaConsent() : null,
  )
  const [visible, setVisible] = useState(() => loadGaConsent() === null)

  useEffect(() => {
    if (choice === "accepted") enableGoogleAnalytics()
  }, [choice])

  useEffect(() => {
    if (reopenToken > 0) setVisible(true)
  }, [reopenToken])

  function decide(value: GaConsent) {
    applyGaConsent(value)
    setChoice(value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-0 bottom-0 z-[200] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line/80 bg-surface/95 p-4 shadow-[0_-8px_32px_rgba(18,34,31,0.16)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p
            id="cookie-banner-title"
            className="font-display text-sm font-bold tracking-tight text-ink"
          >
            Mesure d’audience
          </p>
          <p
            id="cookie-banner-desc"
            className="mt-1 text-xs leading-relaxed text-muted"
          >
            CarbuTarn utilise Google Analytics uniquement si tu acceptes. Tu peux
            refuser sans impact sur l’usage.{" "}
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="font-semibold text-petrol underline decoration-line/80 underline-offset-2 transition hover:text-petrol-deep"
            >
              En savoir plus
            </button>
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("refused")}
            className="min-h-10 flex-1 rounded-xl border border-line/90 bg-paper px-3.5 text-sm font-semibold text-ink-soft transition hover:bg-paper-deep sm:flex-none"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="min-h-10 flex-1 rounded-xl bg-petrol px-3.5 text-sm font-semibold text-surface shadow-sm transition hover:bg-petrol-deep sm:flex-none"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}

export default CookieBanner
