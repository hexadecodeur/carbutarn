import { useEffect, useState } from "react"
import {
  fetchMyReports,
  type MyReport,
} from "../services/participatoryApi"
import type { Station } from "../types/station"
import { formatStationAddress } from "../types/station"

type MyReportsModalProps = {
  stations: Station[]
  onClose: () => void
  onSelectStation?: (stationId: string) => void
}

function formatReportWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatPrice(price: number): string {
  return `${price.toFixed(3).replace(".", ",")} €/L`
}

function reportSummary(report: MyReport): string {
  if (report.agreed) {
    return `${report.fuelType} · Prix OK`
  }
  if (typeof report.price === "number") {
    return `${report.fuelType} · Pas d’accord · ${formatPrice(report.price)}`
  }
  return `${report.fuelType} · Pas d’accord`
}

function stationLabel(
  report: MyReport,
  stationsById: Map<string, Station>,
): { title: string; subtitle: string } {
  const known = stationsById.get(report.stationId)
  if (known) {
    return {
      title: known.name,
      subtitle: formatStationAddress(known),
    }
  }

  const parts = [
    report.station.address,
    [report.station.postalCode, report.station.city].filter(Boolean).join(" "),
  ].filter(Boolean)

  return {
    title: parts[0] || `Station ${report.stationId}`,
    subtitle: parts.slice(1).join(" · ") || "Adresse inconnue",
  }
}

function MyReportsModal({
  stations,
  onClose,
  onSelectStation,
}: MyReportsModalProps) {
  const [reports, setReports] = useState<MyReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchMyReports()
        if (!cancelled) setReports(data.reports)
      } catch (err) {
        console.error("Signalements impossibles à charger :", err)
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger tes signalements.",
          )
          setReports([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const stationsById = new Map(stations.map((s) => [s.id, s]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-reports-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:max-h-[85dvh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line/80 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-petrol">
              Tableau de bord
            </p>
            <h2
              id="my-reports-title"
              className="mt-1 font-display text-xl font-bold tracking-tight text-ink"
            >
              Mes signalements
            </h2>
            <p className="mt-1 text-xs text-muted">
              Historique de tes confirmations et corrections de prix
            </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex h-36 flex-col items-center justify-center gap-2 px-4 text-sm text-muted">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-petrol border-t-transparent" />
              Chargement…
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {!loading && !error && reports && reports.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-ink-soft">
                Aucun signalement pour l’instant
              </p>
              <p className="mt-1 text-xs text-muted">
                Ouvre une station et utilise « Prix OK » ou « Pas d’accord ».
              </p>
            </div>
          )}

          {!loading && !error && reports && reports.length > 0 && (
            <ul className="divide-y divide-line/70">
              {reports.map((report) => {
                const { title, subtitle } = stationLabel(report, stationsById)
                const known = stationsById.has(report.stationId)

                return (
                  <li key={report.id}>
                    <button
                      type="button"
                      disabled={!known || !onSelectStation}
                      onClick={() => {
                        if (!known || !onSelectStation) return
                        onSelectStation(report.stationId)
                        onClose()
                      }}
                      className={`flex w-full flex-col gap-1 px-4 py-3.5 text-left transition sm:px-5 ${
                        known && onSelectStation
                          ? "hover:bg-paper/80"
                          : "cursor-default"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-semibold text-ink">
                          {title}
                        </span>
                        <time
                          dateTime={report.createdAt}
                          className="shrink-0 text-[11px] tabular-nums text-muted"
                        >
                          {formatReportWhen(report.createdAt)}
                        </time>
                      </div>
                      <p className="truncate text-xs text-muted">{subtitle}</p>
                      <p
                        className={`text-xs font-semibold ${
                          report.agreed ? "text-petrol" : "text-amber"
                        }`}
                      >
                        {reportSummary(report)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyReportsModal
