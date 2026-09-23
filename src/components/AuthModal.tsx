import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
} from "react"
import { fetchTurnstileSiteKey } from "../services/participatoryApi"
import { loadTurnstileApi } from "../utils/turnstile"

type AuthModalProps = {
  open: boolean
  onClose: () => void
  onSubmitEmail: (email: string, turnstileToken?: string) => Promise<void>
  flash?: "ok" | "error" | null
  onClearFlash?: () => void
}

function AuthModal({
  open,
  onClose,
  onSubmitEmail,
  flash = null,
  onClearFlash,
}: AuthModalProps) {
  if (!open) return null

  return (
    <AuthModalContent
      onClose={onClose}
      onSubmitEmail={onSubmitEmail}
      flash={flash}
      onClearFlash={onClearFlash}
    />
  )
}

type ContentProps = {
  onClose: () => void
  onSubmitEmail: (email: string, turnstileToken?: string) => Promise<void>
  flash: "ok" | "error" | null
  onClearFlash?: () => void
}

/**
 * Widget Turnstile avec lifecycle isolé.
 * Le cleanup appelle toujours remove(widgetId) avant que React n’arrache le DOM
 * (critique quand le formulaire passe en état « sent »).
 */
function TurnstileWidget({
  siteKey,
  onToken,
  onExpire,
  onError,
  widgetIdRef,
}: {
  siteKey: string
  onToken: (token: string) => void
  onExpire: () => void
  onError?: () => void
  widgetIdRef: MutableRefObject<string | null>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onTokenRef.current = onToken
    onExpireRef.current = onExpire
    onErrorRef.current = onError
  })

  useEffect(() => {
    let cancelled = false
    /** Id local à cette exécution d’effet (StrictMode-safe). */
    let widgetId: string | null = null

    void loadTurnstileApi()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return

        widgetId = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            if (!cancelled) onTokenRef.current(token)
          },
          "expired-callback": () => {
            if (!cancelled) onExpireRef.current()
          },
          "error-callback": () => {
            if (!cancelled) onErrorRef.current?.()
          },
          theme:
            document.documentElement.dataset.theme === "dark" ? "dark" : "light",
        })
        widgetIdRef.current = widgetId
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.()
      })

    return () => {
      cancelled = true
      const id = widgetId
      widgetId = null
      widgetIdRef.current = null
      // remove uniquement si ce run a bien créé un widget
      if (id && window.turnstile) {
        window.turnstile.remove(id)
      }
    }
  }, [siteKey, widgetIdRef])

  return <div ref={containerRef} className="flex min-h-[65px] justify-center" />
}

function AuthModalContent({
  onClose,
  onSubmitEmail,
  flash,
  onClearFlash,
}: ContentProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [email, setEmail] = useState("")
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [captchaReady, setCaptchaReady] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const showForm = flash !== "ok" && status !== "sent"
  const needsCaptcha = Boolean(siteKey)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    void fetchTurnstileSiteKey()
      .then((key) => {
        if (!cancelled) {
          setSiteKey(key)
          setCaptchaReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSiteKey(null)
          setCaptchaReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    if (needsCaptcha && !turnstileToken) {
      setErrorMessage("Valide la vérification anti-robot.")
      return
    }

    setStatus("sending")
    setErrorMessage(null)
    onClearFlash?.()

    try {
      await onSubmitEmail(trimmed, turnstileToken ?? undefined)
      setTurnstileToken(null)
      setStatus("sent")
    } catch (error) {
      setStatus("error")
      setErrorMessage(
        error instanceof Error ? error.message : "Envoi impossible",
      )
      const id = widgetIdRef.current
      if (id && window.turnstile) {
        window.turnstile.reset(id)
      }
      setTurnstileToken(null)
    }
  }

  const canSubmit =
    status !== "sending" &&
    email.trim().length > 0 &&
    captchaReady &&
    (!needsCaptcha || Boolean(turnstileToken))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line/80 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-petrol">
              Compte
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-xl font-bold tracking-tight text-ink"
            >
              Connexion
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-deep text-lg text-ink-soft transition hover:bg-line"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {flash === "error" && (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-amber/15 px-3 py-2.5 text-sm text-ink-soft"
            >
              Lien invalide ou expiré. Demande un nouveau lien ci-dessous.
            </p>
          )}

          {!showForm ? (
            <div className="space-y-3">
              {flash === "ok" ? (
                <p
                  role="status"
                  className="rounded-xl bg-petrol/10 px-3 py-2.5 text-sm text-petrol"
                >
                  Connexion réussie. Bienvenue sur CarbuTarn.
                </p>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Si un compte peut être créé pour{" "}
                    <strong className="font-semibold text-ink">
                      {email.trim()}
                    </strong>
                    , un lien de connexion a été préparé.
                  </p>
                  {import.meta.env.DEV && (
                    <p className="rounded-xl bg-paper-deep/80 px-3 py-2.5 text-xs leading-relaxed text-muted">
                      En local sans Resend : ajoute{" "}
                      <code className="text-[11px]">MAGIC_LINK_DEV_LOG=1</code>{" "}
                      au{" "}
                      <code className="text-[11px]">.env.local</code> de l’API
                      pour afficher le lien une fois dans le terminal.
                    </p>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 w-full rounded-xl bg-petrol px-4 text-sm font-bold text-surface transition hover:bg-petrol-deep"
              >
                Compris
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-sm leading-relaxed text-muted">
                Entre ton e-mail : tu recevras un lien magique pour te connecter,
                sans mot de passe.
              </p>

              <label className="block">
                <span className="sr-only">Adresse e-mail</span>
                <input
                  ref={inputRef}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="toi@exemple.fr"
                  className="w-full rounded-xl border border-line/90 bg-paper/80 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-petrol focus:bg-surface focus:ring-2 focus:ring-petrol/20"
                />
              </label>

              {siteKey && (
                <TurnstileWidget
                  siteKey={siteKey}
                  widgetIdRef={widgetIdRef}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() =>
                    setErrorMessage("Vérification anti-robot indisponible.")
                  }
                />
              )}

              {errorMessage && (
                <p
                  role="alert"
                  className="text-xs text-red-700 dark:text-red-400"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="min-h-11 w-full rounded-xl bg-petrol px-4 text-sm font-bold text-surface transition hover:bg-petrol-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Envoi…" : "Recevoir le lien"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
