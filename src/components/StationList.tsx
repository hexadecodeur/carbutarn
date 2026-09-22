import type { ListFuelType, Station } from "../types/station"
import { formatStationAddress } from "../types/station"
import { LIST_FUEL_TYPES } from "../constants/filters"
import { isPriceStale } from "../utils/priceFreshness"

type StationListProps = {
  stations: Station[]
  loading: boolean
  error: string | null
  selectedFuel: ListFuelType | null
  onSelect: (station: Station) => void
  onRetry?: () => void
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function StationList({
  stations,
  loading,
  error,
  selectedFuel,
  onSelect,
  onRetry,
}: StationListProps) {
  if (loading) {
    return (
      <div className="flex h-36 flex-col items-center justify-center gap-2 px-4 text-sm text-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-petrol border-t-transparent" />
        Chargement des stations…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
          <p className="mt-1 text-xs text-muted">
            Vérifie ta connexion puis réessaie.
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-10 rounded-xl bg-petrol px-4 text-sm font-semibold text-surface transition hover:bg-petrol-deep"
          >
            Réessayer
          </button>
        )}
      </div>
    )
  }

  if (stations.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center gap-1 px-6 text-center text-sm text-muted">
        <p className="font-medium text-ink-soft">Aucune station</p>
        <p className="text-xs">Aucun résultat pour ces filtres.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-line/70">
      {stations.map((station, index) => {
        const latestUpdate = station.fuels
          .map((fuel) => fuel.updatedAt)
          .filter((date): date is string => date !== null)
          .map((date) => new Date(date))
          .sort((a, b) => b.getTime() - a.getTime())[0]

        const isUpdateOld =
          latestUpdate !== undefined && isPriceStale(latestUpdate)

        const highlight = selectedFuel
          ? station.fuels.find((f) => f.type === selectedFuel)
          : null

        const secondaryFuels = selectedFuel
          ? LIST_FUEL_TYPES.filter((type) => type !== selectedFuel)
          : []

        return (
          <li
            key={station.id}
            className="rise-in"
            style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
          >
            <button
              type="button"
              onClick={() => onSelect(station)}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition active:bg-paper-deep/50 hover:bg-paper/80"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-[15px] font-bold tracking-tight text-ink">
                      {station.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {formatStationAddress(station)}
                    </p>
                  </div>

                  {station.distance !== undefined && (
                    <span className="shrink-0 rounded-md bg-paper-deep px-2 py-1 text-[11px] font-semibold text-ink-soft">
                      {formatDistance(station.distance)}
                    </span>
                  )}
                </div>

                {selectedFuel ? (
                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                        {selectedFuel}
                      </p>
                      <p className="font-display text-2xl font-bold leading-none text-petrol tabular-nums">
                        {highlight ? (
                          <>
                            {highlight.price.toFixed(3)}
                            <span className="ml-1 text-sm font-semibold text-muted">
                              €
                            </span>
                          </>
                        ) : (
                          <span className="text-lg text-muted">—</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted">
                      {secondaryFuels.map((type) => {
                        const fuel = station.fuels.find((f) => f.type === type)
                        return (
                          <span key={type} className="tabular-nums">
                            {type}{" "}
                            <strong className="font-semibold text-ink-soft">
                              {fuel ? fuel.price.toFixed(3) : "—"}
                            </strong>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
                    {LIST_FUEL_TYPES.map((type) => {
                      const fuel = station.fuels.find((f) => f.type === type)
                      return (
                        <div key={type} className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                            {type}
                          </p>
                          <p className="truncate text-sm font-semibold tabular-nums text-ink">
                            {fuel ? `${fuel.price.toFixed(3)} €` : "—"}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {latestUpdate && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                    {isUpdateOld && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-amber"
                        title="Prix non mis à jour depuis plus de 3 jours"
                      />
                    )}
                    <span>
                      {latestUpdate.toLocaleDateString("fr-FR")} ·{" "}
                      {latestUpdate.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                )}
              </div>

              <span className="mt-1 text-lg text-line" aria-hidden>
                ›
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default StationList
