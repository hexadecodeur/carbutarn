import type { Station } from "../types/station"
import { formatStationAddress } from "../types/station"
import { openDirections } from "../utils/directions"

type UserLocation = {
  latitude: number
  longitude: number
}

type StationDetailsProps = {
  station: Station
  userLocation?: UserLocation | null
  onClose: () => void
}

function formatDate(date: string | null) {
  if (!date) return "Mise à jour inconnue"

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
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
}: StationDetailsProps) {
  const addressLine = formatStationAddress(station)
  const hoursLabel = formatOpeningHours(station.openingHours)

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

        <div className="mt-5 rounded-2xl border border-dashed border-line bg-paper/40 px-4 py-4">
          <h3 className="font-display text-sm font-bold text-ink">
            Prix constatés
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Bientôt : confirme ou corrige un prix sur place. Les contributions
            seront filtrées pour éviter les abus.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled
              className="min-h-10 flex-1 cursor-not-allowed rounded-xl bg-surface px-3 text-xs font-semibold text-muted/70 ring-1 ring-line"
            >
              Prix OK
            </button>
            <button
              type="button"
              disabled
              className="min-h-10 flex-1 cursor-not-allowed rounded-xl bg-surface px-3 text-xs font-semibold text-muted/70 ring-1 ring-line"
            >
              Pas d&apos;accord
            </button>
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
          Prix officiels : données publiques. Enseignes et position : OpenStreetMap.
        </p>
      </div>
    </div>
  )
}

export default StationDetails
