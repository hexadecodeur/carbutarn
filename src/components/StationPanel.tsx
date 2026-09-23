import { useEffect, useRef, type ReactNode, type HTMLAttributes } from "react"
import type { ListFuelType, PriceSortOrder, SortBy, Station } from "../types/station"
import type { LegalDocId } from "../content/legal"
import type { AuthUser } from "../hooks/useAuth"
import type { MapPriceSource } from "../utils/filterPrefs"
import StationFilters from "./StationFilters"
import StationList from "./StationList"
import StationDetails from "./StationDetails"
import AppFooter from "./AppFooter"

type UserLocation = {
  latitude: number
  longitude: number
}

export type ListOverscrollPullHandlers = {
  onPullStart: (startHeight: number) => void
  onPullMove: (deltaDown: number, layoutHeight: number) => void
  onPullEnd: (layoutHeight: number) => void
}

type StationPanelProps = {
  stations: Station[]
  loading: boolean
  error: string | null
  selectedFuel: ListFuelType | null
  sortBy: SortBy
  priceOrder: PriceSortOrder
  mapPriceSource: MapPriceSource
  onSelectedFuelChange: (fuel: ListFuelType | null) => void
  onSortByChange: (sortBy: SortBy) => void
  onMapPriceSourceChange: (source: MapPriceSource) => void
  onSelectStation: (station: Station) => void
  selectedStation: Station | null
  userLocation: UserLocation | null
  onCloseDetails: () => void
  onOpenLegal: (id: LegalDocId) => void
  onRetry?: () => void
  /** Filtre enseigne actif (affiché en chip) */
  brandFilter?: string | null
  onClearBrandFilter?: () => void
  authUser?: AuthUser | null
  authLoading?: boolean
  onOpenAuth?: () => void
  onLogout?: () => void
  onAuthExpired?: () => void
  onDeleteAccount?: () => void
  onOpenMyReports?: () => void
  /** Affiche le footer (légal + thème). Desktop: toujours ; mobile: si fusionné */
  showFooter?: boolean
  /** Zone de resize mobile (détails) */
  detailsDragHandle?: ReactNode
  /** Props de drag sur tout le bandeau titre + filtres (mobile) */
  listChromeDragProps?: HTMLAttributes<HTMLDivElement>
  /** Pull-down en haut de liste → réduit la feuille (mobile) */
  listOverscrollPull?: ListOverscrollPullHandlers
}

function StationPanel({
  stations,
  loading,
  error,
  selectedFuel,
  sortBy,
  priceOrder,
  mapPriceSource,
  onSelectedFuelChange,
  onSortByChange,
  onMapPriceSourceChange,
  onSelectStation,
  selectedStation,
  userLocation,
  onCloseDetails,
  onOpenLegal,
  onRetry,
  brandFilter = null,
  onClearBrandFilter,
  authUser = null,
  authLoading = false,
  onOpenAuth,
  onLogout,
  onAuthExpired,
  onDeleteAccount,
  onOpenMyReports,
  showFooter = true,
  detailsDragHandle,
  listChromeDragProps,
  listOverscrollPull,
}: StationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pullHandlersRef = useRef(listOverscrollPull)

  const pullEnabled = Boolean(listOverscrollPull) && !selectedStation

  useEffect(() => {
    pullHandlersRef.current = listOverscrollPull
  }, [listOverscrollPull])

  useEffect(() => {
    if (!pullEnabled) return
    const el = scrollRef.current
    if (!el) return

    let startY = 0
    let tracking = false
    let pulling = false

    const onTouchStart = (event: TouchEvent) => {
      if (el.scrollTop > 1) {
        tracking = false
        return
      }
      startY = event.touches[0].clientY
      tracking = true
      pulling = false
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking) return

      const handlers = pullHandlersRef.current
      if (!handlers) return

      // L'utilisateur scrolle le contenu vers le bas → abandon
      if (!pulling && el.scrollTop > 1) {
        tracking = false
        return
      }

      const deltaDown = event.touches[0].clientY - startY

      if (!pulling) {
        // Remonter dans la liste (doigt vers le haut) → scroll normal
        if (deltaDown <= 0) return
        if (el.scrollTop > 1) {
          tracking = false
          return
        }

        const sheet = el.closest("[data-sheet]") as HTMLElement | null
        if (!sheet) {
          tracking = false
          return
        }

        pulling = true
        el.style.overflowY = "hidden"
        handlers.onPullStart(sheet.getBoundingClientRect().height)
      }

      // Empêche le rubber-band / scroll et pilote la feuille
      event.preventDefault()

      const layout = el.closest("[data-layout]") as HTMLElement | null
      const layoutHeight =
        layout?.getBoundingClientRect().height ?? window.innerHeight
      handlers.onPullMove(deltaDown, layoutHeight)
    }

    const onTouchEnd = () => {
      el.style.overflowY = ""
      if (pulling) {
        const handlers = pullHandlersRef.current
        const layout = el.closest("[data-layout]") as HTMLElement | null
        const layoutHeight =
          layout?.getBoundingClientRect().height ?? window.innerHeight
        handlers?.onPullEnd(layoutHeight)
      }
      tracking = false
      pulling = false
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    el.addEventListener("touchcancel", onTouchEnd)

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [pullEnabled])

  if (selectedStation) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-surface">
        {detailsDragHandle}
        <div className="min-h-0 flex-1">
          <StationDetails
            station={selectedStation}
            userLocation={userLocation}
            onClose={onCloseDetails}
            isAuthenticated={Boolean(authUser)}
            onOpenAuth={onOpenAuth}
            onAuthExpired={onAuthExpired}
          />
        </div>
        {showFooter && (
          <AppFooter
            onOpen={onOpenLegal}
            compact
            user={authUser}
            authLoading={authLoading}
            onOpenAuth={onOpenAuth}
            onLogout={onLogout}
            onDeleteAccount={onDeleteAccount}
            onOpenMyReports={onOpenMyReports}
          />
        )}
      </div>
    )
  }

  const countLabel = loading ? "…" : `${stations.length}`
  const needsLocationHint = sortBy === "distance" && !userLocation && !loading && !error

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div
        {...listChromeDragProps}
        className="shrink-0 touch-none border-b border-line/80 bg-surface select-none"
      >
        <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-bold tracking-tight text-ink">
              Stations
            </h2>
            <span className="rounded-md bg-paper-deep px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
              {countLabel}
            </span>
          </div>

          {brandFilter && onClearBrandFilter && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-petrol/10 px-2.5 py-1.5 text-xs font-semibold text-petrol ring-1 ring-petrol/20">
                <span className="truncate">{brandFilter}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onClearBrandFilter()
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-petrol/80 transition hover:bg-petrol/15 hover:text-petrol"
                  aria-label={`Retirer le filtre ${brandFilter}`}
                >
                  ×
                </button>
              </span>
            </div>
          )}

          {needsLocationHint && (
            <p className="mt-2.5 rounded-lg bg-paper-deep/80 px-2.5 py-2 text-xs leading-relaxed text-muted">
              Localise-toi ou cherche une ville pour trier par distance.
            </p>
          )}

          <div className="touch-auto">
            <StationFilters
              selectedFuel={selectedFuel}
              sortBy={sortBy}
              priceOrder={priceOrder}
              mapPriceSource={mapPriceSource}
              onSelectedFuelChange={onSelectedFuelChange}
              onSortByChange={onSortByChange}
              onMapPriceSourceChange={onMapPriceSourceChange}
            />
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
        <StationList
          stations={stations}
          loading={loading}
          error={error}
          selectedFuel={selectedFuel}
          onSelect={onSelectStation}
          onRetry={onRetry}
        />
      </div>

      {showFooter && (
        <AppFooter
          onOpen={onOpenLegal}
          compact
          user={authUser}
          authLoading={authLoading}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
          onOpenMyReports={onOpenMyReports}
        />
      )}
    </div>
  )
}

export default StationPanel
