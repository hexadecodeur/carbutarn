import type { Station } from "../types/station"

type StationDetailsProps = {
  station: Station
  onClose: () => void
}

function formatDate(date: string | null) {
  if (!date) return "Mise à jour inconnue"

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

function StationDetails({ station, onClose }: StationDetailsProps) {
  return (
    <div
      className="
        absolute inset-x-0 bottom-0 z-30
        h-[45%] overflow-y-auto
        rounded-t-3xl bg-white shadow-2xl

        md:inset-y-0 md:left-auto md:right-0
        md:h-auto md:w-[420px] md:max-h-none
        md:rounded-none md:border-l md:border-slate-200
      "
    >
      {/* Petite poignée */}
      <div className="sticky top-0 z-10 bg-white pt-3">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 md:hidden" />

        <div className="flex items-start justify-between px-4 pb-3 pt-2 md:px-5 md:pb-4 md:pt-3">
          <div>
            <h2 className="text-lg font-bold md:text-xl">Station-service</h2>

            <p className="mt-1 text-sm text-slate-500">
              {station.address !== "Adresse inconnue" &&
                `${station.address} · `}
              {station.postalCode} {station.city}
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl transition hover:bg-slate-200"
            aria-label="Fermer la fiche"
          >
            ×
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Prix officiels
        </h3>

        <div className="mt-3 divide-y divide-slate-100">
          {station.fuels.map((fuel) => (
            <div
              key={fuel.type}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="font-semibold">{fuel.type}</p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDate(fuel.updatedAt)}
                </p>
              </div>

              <p className="text-lg font-bold">
                {fuel.price.toFixed(3)} €
                <span className="ml-1 text-xs font-normal text-slate-500">
                  /L
                </span>
              </p>
            </div>
          ))}
        </div>

        {station.services.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Services
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {station.services.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-slate-100 px-3 py-2 text-xs"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Coordonnées
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
          </p>
        </div>

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Prix issus des données publiques officielles.
        </p>
      </div>
    </div>
  )
}

export default StationDetails
