import { useEffect, useState, type FormEvent } from "react"
import type { FuelType, Station } from "../types/station"
import { formatStationAddress } from "../types/station"
import { openDirections } from "../utils/directions"
import {
  fetchStationPrices,
  submitReport,
  type StationPricesResponse,
} from "../services/participatoryApi"

type UserLocation = {
  latitude: number
  longitude: number
}

type StationDetailsProps = {
  station: Station
  userLocation?: UserLocation | null
  onClose: () => void
  isAuthenticated?: boolean
  onOpenAuth?: () => void
  /** Session cookie rejetée par l’API (401) */
  onAuthExpired?: () => void
}

function formatDate(date: string | null) {
  if (!date) return "Dernière mise à jour inconnue"

  const value = new Date(date)
  const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(
    value,
  )
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)

  return `Dernière mise à jour le ${day} à ${time}`
}

function formatOpeningHours(raw: string | null): string | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === "string") return parsed
    return null
  } catch {
    return raw.length < 120 ? raw : null
  }
}

function StationDetails({
  station,
  userLocation = null,
  onClose,
  isAuthenticated = false,
  onOpenAuth,
  onAuthExpired,
}: StationDetailsProps) {
  const addressLine = formatStationAddress(station)
  const hoursLabel = formatOpeningHours(station.openingHours)

  const [prices, setPrices] = useState<StationPricesResponse | null>(null)
  const [pricesLoading, setPricesLoading] = useState(true)
  const [pricesError, setPricesError] = useState<string | null>(null)
  const [busyFuel, setBusyFuel] = useState<FuelType | null>(null)
  const [correctingFuel, setCorrectingFuel] = useState<FuelType | null>(null)
  const [draftPrice, setDraftPrice] = useState("")
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function handlePricesError(error: unknown) {
    setPricesError(
      error instanceof Error ? error.message : "Chargement impossible",
    )
  }

  async function loadPrices() {
    setPricesLoading(true)
    setPricesError(null)
    try {
      const data = await fetchStationPrices(station.id)
      setPrices(data)
      if (isAuthenticated && !data.viewer.authenticated) {
        onAuthExpired?.()
      }
    } catch (error) {
      console.error("Prix participatifs indisponibles :", error)
      handlePricesError(error)
    } finally {
      setPricesLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setPricesLoading(true)
      setPricesError(null)
      try {
        const data = await fetchStationPrices(station.id)
        if (cancelled) return
        setPrices(data)
        if (isAuthenticated && !data.viewer.authenticated) {
          onAuthExpired?.()
        }
      } catch (error) {
        console.error("Prix participatifs indisponibles :", error)
        if (!cancelled) handlePricesError(error)
      } finally {
        if (!cancelled) setPricesLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on station / auth only
  }, [station.id, isAuthenticated])

  useEffect(() => {
    if (!actionMessage) return
    const timer = window.setTimeout(() => setActionMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [actionMessage])

  useEffect(() => {
    if (!actionError) return
    const timer = window.setTimeout(() => setActionError(null), 5000)
    return () => window.clearTimeout(timer)
  }, [actionError])

  function observedFor(type: FuelType) {
    return prices?.observed.find((row) => row.type === type) ?? null
  }

  function isOutage(
    observed: StationPricesResponse["observed"][number] | null,
  ) {
    return Boolean(observed?.published && observed.outage)
  }

  function displayPrice(
    observed: StationPricesResponse["observed"][number] | null,
  ): number | null {
    if (!observed?.published || observed.outage) return null
    return typeof observed.price === "number" ? observed.price : null
  }

  function alreadyReported(type: FuelType) {
    return Boolean(prices?.viewer.reportedFuelTypes?.includes(type))
  }

  async function sendReport(
    fuelType: FuelType,
    options: { agreed?: boolean; price?: number; outage?: boolean },
  ) {
    setBusyFuel(fuelType)
    setActionError(null)
    setActionMessage(null)

    try {
      await submitReport(station.id, {
        fuelType,
        agreed: options.outage ? false : options.agreed,
        price: options.price,
        outage: options.outage,
      })
      setCorrectingFuel(null)
      setDraftPrice("")
      setActionMessage(
        options.outage
          ? `Merci — rupture ${fuelType} signalée.`
          : options.agreed
            ? `Merci — ${fuelType} confirmé.`
            : `Merci — prix ${fuelType} signalé.`,
      )
      await loadPrices()
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status?: number }).status)
          : undefined
      if (status === 401) {
        onAuthExpired?.()
        setActionError("Session expirée — reconnecte-toi pour signaler.")
      } else {
        setActionError(
          error instanceof Error ? error.message : "Envoi impossible",
        )
      }
    } finally {
      setBusyFuel(null)
    }
  }

  function startCorrection(fuel: { type: FuelType; price: number }) {
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    setCorrectingFuel(fuel.type)
    setDraftPrice(fuel.price.toFixed(3))
    setActionError(null)
    setActionMessage(null)
  }

  function handleConfirm(fuel: { type: FuelType; price: number }) {
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    void sendReport(fuel.type, { agreed: true })
  }

  function handleOutage(fuel: { type: FuelType }) {
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    void sendReport(fuel.type, { outage: true })
  }

  function handleCorrectionSubmit(event: FormEvent) {
    event.preventDefault()
    if (!correctingFuel) return

    const normalized = draftPrice.replace(",", ".")
    const value = Number(normalized)
    if (Number.isNaN(value) || value <= 0) {
      setActionError("Saisis un prix valide (ex. 1.689)")
      return
    }

    void sendReport(correctingFuel, { agreed: false, price: value })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="shrink-0 border-b border-line/80 px-4 pb-3 pt-1 md:px-5 md:pb-4 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-petrol">
              Station
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-ink md:text-2xl">
              {station.name}
            </h2>

            <p className="mt-1.5 text-sm text-muted">{addressLine}</p>

            {station.distance !== undefined && (
              <p className="mt-2 inline-flex rounded-md bg-paper-deep px-2 py-1 text-xs font-semibold text-ink-soft">
                {station.distance < 1
                  ? `${Math.round(station.distance * 1000)} m`
                  : `${station.distance.toFixed(1)} km`}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-deep text-lg text-ink-soft transition hover:bg-line"
            aria-label="Fermer la fiche"
          >
            ×
          </button>
        </div>
      </div>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
        <button
          type="button"
          onClick={() => openDirections(station, userLocation)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-petrol px-4 py-3.5 text-sm font-bold text-surface transition hover:bg-petrol-deep active:scale-[0.99]"
        >
          Y aller
        </button>

        <div className="mt-6">
          <h3 className="font-display text-sm font-bold text-ink">
            Prix officiels
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            Données publiques du gouvernement
          </p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-line/80 bg-paper/50">
            {station.fuels.map((fuel) => (
              <div
                key={fuel.type}
                className="flex items-center justify-between border-b border-line/70 px-4 py-3.5 last:border-b-0"
              >
                <div>
                  <p className="font-semibold text-ink">{fuel.type}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(fuel.updatedAt)}
                  </p>
                </div>

                <p className="font-display text-xl font-bold tabular-nums text-petrol">
                  {fuel.price.toFixed(3)}
                  <span className="ml-1 text-xs font-semibold text-muted">
                    €/L
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-line/80 bg-paper/40 px-4 py-4">
          <h3 className="font-display text-sm font-bold text-ink">
            Prix constatés
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Par défaut : prix officiel. Consensus prix (±0,010 €/L) dès 3 avis ;
            rupture dès 4 avis. Un nouveau consensus remplace le précédent.
          </p>

          {!isAuthenticated && onOpenAuth && (
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              <button
                type="button"
                onClick={onOpenAuth}
                className="font-semibold text-petrol underline-offset-2 hover:underline"
              >
                Connecte-toi
              </button>{" "}
              pour confirmer, corriger ou signaler une rupture.
            </p>
          )}

          {pricesLoading && (
            <p className="mt-3 text-xs text-muted">Chargement des avis…</p>
          )}
          {pricesError && (
            <p className="mt-3 text-xs text-red-700 dark:text-red-400">
              {pricesError}
            </p>
          )}

          {actionMessage && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-petrol/10 px-3 py-2 text-xs text-petrol"
            >
              {actionMessage}
            </p>
          )}
          {actionError && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-amber/15 px-3 py-2 text-xs text-ink-soft"
            >
              {actionError}
            </p>
          )}

          <div className="mt-3 space-y-3">
            {station.fuels.map((fuel) => {
              const observed = observedFor(fuel.type)
              const reported = alreadyReported(fuel.type)
              const busy = busyFuel === fuel.type
              const correcting = correctingFuel === fuel.type
              const outage = isOutage(observed)
              const price = displayPrice(observed)
              const source = observed?.source ?? "official"

              return (
                <div
                  key={`observed-${fuel.type}`}
                  className="rounded-xl border border-line/70 bg-surface px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {fuel.type}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {outage
                          ? `${observed?.sampleCount ?? "—"} avis · Rupture`
                          : source === "community"
                            ? `${observed?.sampleCount ?? "—"} avis`
                            : source === "official"
                              ? "Prix officiel (pas encore modifié)"
                              : "Avis en cours de consensus"}
                      </p>
                      {observed?.computedAt && source !== "official" && (
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDate(observed.computedAt)}
                        </p>
                      )}
                    </div>
                    {outage ? (
                      <p className="font-display text-sm font-extrabold tracking-wide text-red-600 dark:text-red-400">
                        RUPTURE
                      </p>
                    ) : (
                      <p className="font-display text-lg font-bold tabular-nums text-ink">
                        {price != null ? (
                          <>
                            {price.toFixed(3)}
                            <span className="ml-1 text-xs font-semibold text-muted">
                              €/L
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold text-muted">
                            —
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {correcting ? (
                    <form
                      onSubmit={handleCorrectionSubmit}
                      className="mt-3 space-y-2"
                    >
                      <label className="block">
                        <span className="text-[11px] font-medium text-muted">
                          Prix constaté (€/L)
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draftPrice}
                          onChange={(event) => setDraftPrice(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-line/90 bg-paper/80 px-3 py-2 text-sm tabular-nums text-ink outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20"
                          placeholder="1.689"
                          autoFocus
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectingFuel(null)
                            setDraftPrice("")
                          }}
                          className="min-h-9 flex-1 rounded-lg bg-paper-deep text-xs font-semibold text-ink-soft"
                          disabled={busy}
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={busy}
                          className="min-h-9 flex-1 rounded-lg bg-petrol text-xs font-semibold text-surface disabled:opacity-60"
                        >
                          {busy ? "Envoi…" : "Envoyer"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || reported}
                        onClick={() => handleConfirm(fuel)}
                        className={`min-h-9 min-w-0 flex-1 rounded-lg px-2 text-xs font-semibold ring-1 transition ${
                          reported
                            ? "cursor-not-allowed bg-paper-deep text-muted/70 ring-line"
                            : "bg-surface text-petrol ring-petrol/30 hover:bg-petrol/10"
                        }`}
                      >
                        {reported ? "Déjà signalé" : "Prix OK"}
                      </button>
                      <button
                        type="button"
                        disabled={busy || reported}
                        onClick={() => startCorrection(fuel)}
                        className={`min-h-9 min-w-0 flex-1 rounded-lg px-2 text-xs font-semibold ring-1 transition ${
                          reported
                            ? "cursor-not-allowed bg-paper-deep text-muted/70 ring-line"
                            : "bg-surface text-ink-soft ring-line hover:bg-paper-deep"
                        }`}
                      >
                        Pas d&apos;accord
                      </button>
                      <button
                        type="button"
                        disabled={busy || reported}
                        onClick={() => handleOutage(fuel)}
                        className={`min-h-9 min-w-0 flex-1 rounded-lg px-2 text-xs font-semibold ring-1 transition ${
                          reported
                            ? "cursor-not-allowed bg-paper-deep text-muted/70 ring-line"
                            : "bg-surface text-red-700 ring-red-600/30 hover:bg-red-600/10 dark:text-red-400"
                        }`}
                      >
                        Rupture
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {(station.is24h || hoursLabel) && (
          <div className="mt-5">
            <h3 className="font-display text-sm font-bold text-ink">Horaires</h3>
            <p className="mt-1.5 text-sm text-ink-soft">
              {station.is24h ? "Automate 24h/24" : hoursLabel}
            </p>
          </div>
        )}

        {station.services.length > 0 && (
          <div className="mt-5">
            <h3 className="font-display text-sm font-bold text-ink">Services</h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {station.services.map((service) => (
                <span
                  key={service}
                  className="rounded-lg bg-paper-deep px-2.5 py-1.5 text-xs font-medium text-ink-soft"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-line/80 pt-4 text-xs leading-relaxed text-muted">
          Prix officiels : données publiques (via API CarbuTarn). Enseignes :
          OpenStreetMap. Prix constatés : compte, délai 2 h, fourchette ±10 %,
          consensus prix 3 avis / rupture 4 avis.
        </p>
      </div>
    </div>
  )
}

export default StationDetails
