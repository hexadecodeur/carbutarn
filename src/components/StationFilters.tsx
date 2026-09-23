import type { ListFuelType, PriceSortOrder, SortBy } from "../types/station"
import type { MapPriceSource } from "../utils/filterPrefs"
import { FUEL_OPTIONS, SORT_BY_OPTIONS } from "../constants/filters"

type StationFiltersProps = {
  selectedFuel: ListFuelType | null
  sortBy: SortBy
  priceOrder: PriceSortOrder
  mapPriceSource: MapPriceSource
  onSelectedFuelChange: (fuel: ListFuelType | null) => void
  onSortByChange: (sortBy: SortBy) => void
  onMapPriceSourceChange: (source: MapPriceSource) => void
}

function StationFilters({
  selectedFuel,
  sortBy,
  priceOrder,
  mapPriceSource,
  onSelectedFuelChange,
  onSortByChange,
  onMapPriceSourceChange,
}: StationFiltersProps) {
  function toggleFuel(fuel: ListFuelType) {
    onSelectedFuelChange(selectedFuel === fuel ? null : fuel)
  }

  return (
    <div className="mt-3 space-y-2.5">
      <div
        className="flex gap-1 overflow-x-auto rounded-xl bg-paper-deep/70 p-1"
        role="tablist"
        aria-label="Carburant"
      >
        {FUEL_OPTIONS.map(({ value, label }) => {
          const active = selectedFuel === value
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => toggleFuel(value)}
              className={`min-h-10 shrink-0 rounded-lg px-3.5 text-sm font-semibold transition ${
                active
                  ? "bg-petrol text-surface shadow-sm"
                  : "text-ink-soft hover:bg-surface/70"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {selectedFuel && (
        <div className="flex items-center gap-2">
          <p className="shrink-0 text-xs font-medium text-muted">Carte</p>
          <div
            className="flex min-w-0 flex-1 gap-1 rounded-lg bg-paper-deep/70 p-0.5"
            role="group"
            aria-label="Source des prix sur la carte"
          >
            {(
              [
                { value: "official", label: "Officiel" },
                { value: "shared", label: "Partagés" },
              ] as const
            ).map(({ value, label }) => {
              const active = mapPriceSource === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onMapPriceSourceChange(value)}
                  className={`min-h-9 flex-1 rounded-md px-3 text-xs font-semibold transition ${
                    active
                      ? "bg-surface text-petrol shadow-sm ring-1 ring-line/80"
                      : "text-ink-soft hover:bg-surface/60"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <p className="shrink-0 text-xs font-medium text-muted">
          {selectedFuel ? (
            <>
              <span className="font-semibold text-ink-soft">{selectedFuel}</span>
              <span className="mx-1.5 text-line">›</span>
              Trier par
            </>
          ) : (
            <>Trier par</>
          )}
        </p>

        <div
          className="flex min-w-0 flex-1 gap-1 rounded-lg bg-paper-deep/70 p-0.5"
          role="group"
          aria-label="Trier par"
        >
          {SORT_BY_OPTIONS.map(({ value, label }) => {
            const disabled = value === "price" && selectedFuel === null
            const active = sortBy === value
            const priceLabel =
              value === "price" && active
                ? priceOrder === "asc"
                  ? "Prix ↑"
                  : "Prix ↓"
                : label

            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                title={
                  disabled
                    ? "Choisis un carburant pour trier par prix"
                    : value === "price"
                      ? active
                        ? priceOrder === "asc"
                          ? "Croissant — recliquer pour décroissant"
                          : "Décroissant — recliquer pour croissant"
                        : "Trier par prix (croissant)"
                      : undefined
                }
                onClick={() => onSortByChange(value)}
                className={`min-h-9 flex-1 rounded-md px-3 text-xs font-semibold transition ${
                  disabled
                    ? "cursor-not-allowed text-muted/50"
                    : active
                      ? "bg-surface text-petrol shadow-sm ring-1 ring-line/80"
                      : "text-ink-soft hover:bg-surface/60"
                }`}
              >
                {priceLabel}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default StationFilters
