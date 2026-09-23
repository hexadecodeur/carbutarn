import { useEffect, useRef, useState } from "react"
import AuthModal from "./components/AuthModal"
import BrandMark from "./components/BrandMark"
import LegalModal from "./components/LegalModal"
import MyReportsModal from "./components/MyReportsModal"
import StationMap, { type StationMapHandle } from "./components/StationMap"
import StationPanel from "./components/StationPanel"
import { searchCities, type City } from "./services/cityApi"
import { useAuth } from "./hooks/useAuth"
import { useFilterPrefs } from "./hooks/useFilterPrefs"
import { useLegalDoc } from "./hooks/useLegalDoc"
import { useMobileSheet } from "./hooks/useMobileSheet"
import { usePanelWidth } from "./hooks/usePanelWidth"
import { useStations } from "./hooks/useStations"
import type { Station } from "./types/station"
import { formatStationAddress } from "./types/station"
import { getDistanceKm } from "./utils/distance"
import {
  searchBrands,
  searchStations,
  stationMatchesBrand,
  type BrandMatch,
} from "./utils/stationSearch"
import {
  loadRecentSearches,
  pushRecentSearch,
  recentFromBrand,
  recentFromCity,
  recentFromStation,
  type RecentSearch,
} from "./utils/recentSearches"
import {
  sortStations,
  withDistance,
  type ReferenceLocation,
} from "./utils/stationSort"

function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function App() {
  const mapRef = useRef<StationMapHandle>(null)

  const { stations, loading, error: loadError, retry: retryLoadStations } =
    useStations()
  const {
    selectedFuel,
    sortBy,
    priceOrder,
    handleSelectedFuelChange,
    handleSortByChange,
  } = useFilterPrefs()
  const { legalDocId, openLegal, closeLegal } = useLegalDoc()
  const {
    user: authUser,
    loading: authLoading,
    authOpen,
    flash: authFlash,
    openAuth,
    closeAuth,
    requestMagicLink,
    logout,
    clearSession,
    deleteAccount,
    clearFlash,
  } = useAuth()
  const {
    panelWidth,
    isResizingPanel,
    onPanelResizeStart,
    onPanelResizeMove,
    onPanelResizeEnd,
    resetPanelWidth,
  } = usePanelWidth()
  const {
    layoutRef,
    mobileHeaderRef,
    mobileHeaderHeight,
    sheetHeightPx,
    isSheetMerged,
    mobileSheetStyle,
    openSheetFull,
    openSheetHalf,
    resetSheetToDefault,
    onSheetPointerDown,
    onSheetPointerMove,
    onSheetPointerUp,
    onSheetChromeClick,
    onListOverscrollPullStart,
    onListOverscrollPullMove,
    onListOverscrollPullEnd,
  } = useMobileSheet()

  const [locateStatus, setLocateStatus] = useState<string | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [citySuggestions, setCitySuggestions] = useState<City[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [brandFilter, setBrandFilter] = useState<string | null>(null)
  const [myReportsOpen, setMyReportsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() =>
    typeof window !== "undefined" ? loadRecentSearches() : [],
  )
  const [referenceLocation, setReferenceLocation] =
    useState<ReferenceLocation | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootFromUserLocation() {
      if (!window.isSecureContext || !navigator.geolocation) return

      try {
        if (!navigator.permissions?.query) return
        const permission = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        })
        if (cancelled || permission.state !== "granted") return
      } catch {
        return
      }

      // Laisser le temps à la carte de se monter
      window.setTimeout(() => {
        if (!cancelled) mapRef.current?.locateUser({ silent: true })
      }, 250)
    }

    void bootFromUserLocation()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!locateStatus) return
    // Laisser le message de recherche jusqu’au succès / erreur
    if (locateStatus.startsWith("Recherche")) return
    const timeout = window.setTimeout(() => setLocateStatus(null), 6000)
    return () => window.clearTimeout(timeout)
  }, [locateStatus])

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) return

    const timeout = window.setTimeout(() => {
      searchCities(query)
        .then(setCitySuggestions)
        .catch((cityError) => {
          console.error("Recherche de commune impossible :", cityError)
          setCitySuggestions([])
        })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    if (!showSuggestions) return

    function onPointerDown(event: globalThis.PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest("[data-search-root]")) return
      setShowSuggestions(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [showSuggestions])

  function rememberSearch(entry: RecentSearch) {
    setRecentSearches((current) => pushRecentSearch(current, entry))
  }

  function clearBrandFilter() {
    const activeBrand = brandFilter
    setBrandFilter(null)
    if (activeBrand) {
      setSearchQuery((current) =>
        current.trim() === activeBrand ? "" : current,
      )
    }
  }

  function selectCity(city: City) {
    rememberSearch(recentFromCity(city))
    setSearchQuery(city.name)
    setCitySuggestions([])
    setShowSuggestions(false)
    setSelectedStationId(null)
    setBrandFilter(null)
    setReferenceLocation({
      latitude: city.latitude,
      longitude: city.longitude,
    })

    const nearestStation = stations
      .map((station) => ({
        station,
        distance: getDistanceKm(
          city.latitude,
          city.longitude,
          station.latitude,
          station.longitude,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0]

    if (!nearestStation) {
      mapRef.current?.focusLocation(city.longitude, city.latitude, 12)
      return
    }

    mapRef.current?.focusArea(city.longitude, city.latitude, [
      nearestStation.station,
    ])
  }

  function selectBrand(match: BrandMatch) {
    rememberSearch(recentFromBrand(match.brand, match.count))
    setSearchQuery(match.brand)
    setCitySuggestions([])
    setShowSuggestions(false)
    setSelectedStationId(null)
    setBrandFilter(match.brand)

    const lon =
      match.stations.reduce((sum, s) => sum + s.longitude, 0) /
      match.stations.length
    const lat =
      match.stations.reduce((sum, s) => sum + s.latitude, 0) /
      match.stations.length

    setReferenceLocation({ latitude: lat, longitude: lon })
    mapRef.current?.focusArea(lon, lat, match.stations)
    resetSheetToDefault()
  }

  function selectStation(station: Station) {
    setSelectedStationId(station.id)
    openSheetFull()
    mapRef.current?.focusStation(station.id)
  }

  function selectStationFromSearch(station: Station) {
    rememberSearch(recentFromStation(station))
    setBrandFilter(null)
    setSearchQuery(station.brand || station.name)
    setCitySuggestions([])
    setShowSuggestions(false)
    selectStation(station)
  }

  function selectRecent(entry: RecentSearch) {
    if (entry.type === "city") {
      selectCity(entry.city)
      return
    }

    if (entry.type === "brand") {
      const match = searchBrands(stations, entry.brand, 20)[0]
      if (match) selectBrand(match)
      return
    }

    const station = stations.find((s) => s.id === entry.stationId)
    if (station) selectStationFromSearch(station)
  }

  function closeDetails() {
    setSelectedStationId(null)
    openSheetHalf()
  }

  const trimmedQuery = searchQuery.trim()
  const brandSuggestions =
    trimmedQuery.length >= 2 ? searchBrands(stations, trimmedQuery) : []
  const stationSuggestions =
    trimmedQuery.length >= 2 ? searchStations(stations, trimmedQuery) : []
  const cityResults = trimmedQuery.length >= 2 ? citySuggestions : []
  const showRecent = trimmedQuery.length < 2 && recentSearches.length > 0
  const hasSuggestions =
    showRecent ||
    brandSuggestions.length > 0 ||
    stationSuggestions.length > 0 ||
    cityResults.length > 0

  const visibleStations = brandFilter
    ? stations.filter((station) => stationMatchesBrand(station, brandFilter))
    : stations

  const sortedStations = sortStations(visibleStations, {
    reference: referenceLocation,
    sortBy,
    selectedFuel,
    priceOrder,
  })

  const selectedStation = selectedStationId
    ? stations.find((s) => s.id === selectedStationId)
    : undefined

  const selectedWithDistance = selectedStation
    ? withDistance(selectedStation, referenceLocation)
    : null

  const detailsDragHandle = (
    <div className="flex shrink-0 justify-center border-b border-line/80 bg-surface md:hidden">
      <button
        type="button"
        data-sheet-drag
        aria-label="Redimensionner la liste"
        className="flex w-full touch-none flex-col items-center py-2.5"
        onClick={onSheetChromeClick}
        onPointerDown={onSheetPointerDown}
        onPointerMove={onSheetPointerMove}
        onPointerUp={onSheetPointerUp}
        onPointerCancel={onSheetPointerUp}
      >
        <span className="h-1 w-10 rounded-full bg-line" />
      </button>
    </div>
  )

  const listChromeDragProps = {
    onPointerDown: onSheetPointerDown,
    onPointerMove: onSheetPointerMove,
    onPointerUp: onSheetPointerUp,
    onPointerCancel: onSheetPointerUp,
    onClick: onSheetChromeClick,
  }

  const listOverscrollPull = {
    onPullStart: onListOverscrollPullStart,
    onPullMove: onListOverscrollPullMove,
    onPullEnd: onListOverscrollPullEnd,
  }

  const panelProps = {
    stations: sortedStations,
    loading,
    error: loadError,
    selectedFuel,
    sortBy,
    priceOrder,
    onSelectedFuelChange: handleSelectedFuelChange,
    onSortByChange: handleSortByChange,
    onSelectStation: selectStation,
    selectedStation: selectedWithDistance,
    userLocation: referenceLocation,
    onCloseDetails: closeDetails,
    onOpenLegal: openLegal,
    onRetry: loadError ? retryLoadStations : undefined,
    brandFilter,
    onClearBrandFilter: clearBrandFilter,
    authUser,
    authLoading,
    onOpenAuth: openAuth,
    onLogout: () => {
      void logout()
    },
    onAuthExpired: clearSession,
    onDeleteAccount: () => {
      const ok = window.confirm(
        "Supprimer définitivement ton compte CarbuTarn et tes signalements ?",
      )
      if (!ok) return
      void deleteAccount().catch((error) => {
        console.error("Suppression impossible :", error)
        window.alert(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer le compte.",
        )
      })
    },
    onOpenMyReports: authUser
      ? () => {
          setMyReportsOpen(true)
        }
      : undefined,
  }

  function renderSearchBar(inputId: string) {
    return (
      <div className="relative z-50" data-search-root>
        <label className="sr-only" htmlFor={inputId}>
          Rechercher une ville ou une enseigne
        </label>
        <input
          id={inputId}
          type="search"
          value={searchQuery}
          onChange={(event) => {
            const value = event.target.value
            setSearchQuery(value)
            setShowSuggestions(true)
            if (value.trim().length === 0) {
              clearBrandFilter()
            }
            if (isSheetMerged && value.trim().length > 0) {
              resetSheetToDefault()
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Ville ou enseigne…"
          autoComplete="off"
          className="w-full rounded-xl border border-line/90 bg-paper/80 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-petrol focus:bg-surface focus:ring-2 focus:ring-petrol/20"
        />

        {showSuggestions && hasSuggestions && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1.5 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
            {showRecent && (
              <div>
                <p className="sticky top-0 bg-paper/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted backdrop-blur-sm">
                  Récentes
                </p>
                {recentSearches.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => selectRecent(entry)}
                    className="flex w-full items-center justify-between gap-3 border-b border-line/60 px-3.5 py-3 text-left text-sm transition hover:bg-paper"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">
                        {entry.label}
                      </span>
                      {entry.subtitle && (
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {entry.subtitle}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {entry.type === "city"
                        ? "Ville"
                        : entry.type === "brand"
                          ? "Enseigne"
                          : "Station"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {brandSuggestions.length > 0 && (
              <div>
                <p className="sticky top-0 bg-paper/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted backdrop-blur-sm">
                  Enseignes
                </p>
                {brandSuggestions.map((match) => (
                  <button
                    key={`brand-${match.brand}`}
                    type="button"
                    onClick={() => selectBrand(match)}
                    className="flex w-full items-center justify-between border-b border-line/60 px-3.5 py-3 text-left text-sm transition hover:bg-paper"
                  >
                    <span className="font-semibold text-ink">{match.brand}</span>
                    <span className="text-xs tabular-nums text-muted">
                      {match.count} station{match.count > 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {stationSuggestions.length > 0 && (
              <div>
                <p className="sticky top-0 bg-paper/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted backdrop-blur-sm">
                  Stations
                </p>
                {stationSuggestions.map((station) => (
                  <button
                    key={`station-${station.id}`}
                    type="button"
                    onClick={() => selectStationFromSearch(station)}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-line/60 px-3.5 py-3 text-left text-sm transition hover:bg-paper"
                  >
                    <span className="font-semibold text-ink">{station.name}</span>
                    <span className="truncate text-xs text-muted">
                      {formatStationAddress(station)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {cityResults.length > 0 && (
              <div>
                <p className="sticky top-0 bg-paper/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted backdrop-blur-sm">
                  Villes
                </p>
                {cityResults.map((city) => (
                  <button
                    key={`${city.name}-${city.postalCodes.join("-")}`}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="flex w-full items-center justify-between border-b border-line/60 px-3.5 py-3 text-left text-sm transition last:border-b-0 hover:bg-paper"
                  >
                    <span className="font-semibold text-ink">{city.name}</span>
                    <span className="text-xs tabular-nums text-muted">
                      {city.postalCodes.join(", ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden text-ink">
      <header
        ref={mobileHeaderRef}
        className={`absolute inset-x-0 top-0 z-30 md:hidden ${
          isSheetMerged
            ? "border-b border-line/80 bg-surface pt-[max(0.75rem,env(safe-area-inset-top))]"
            : "px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        }`}
      >
        <div
          className={
            isSheetMerged
              ? "px-3 pb-3"
              : "rounded-2xl border border-line/70 bg-surface/90 p-3 shadow-[0_8px_28px_rgba(18,34,31,0.12)] backdrop-blur-md transition-[border-radius,box-shadow,background-color] duration-200"
          }
        >
          <div className="mb-2.5 flex items-center gap-2.5">
            <BrandMark className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-extrabold leading-none tracking-tight text-ink">
                CarbuTarn
              </h1>
              <p className="mt-1 truncate text-[11px] font-medium text-muted">
                Prix carburants · Tarn
              </p>
            </div>
          </div>
          {renderSearchBar("place-search-mobile")}
        </div>
      </header>

      <header className="relative z-40 hidden shrink-0 overflow-visible border-b border-line/80 bg-surface/95 px-5 py-3 backdrop-blur-sm md:block">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div>
              <h1 className="font-display text-xl font-extrabold leading-none tracking-tight">
                CarbuTarn
              </h1>
              <p className="mt-1 text-xs font-medium text-muted">
                Compare les prix autour de toi
              </p>
            </div>
          </div>
          <div className="relative z-50 max-w-md flex-1">
            {renderSearchBar("place-search-desktop")}
          </div>
        </div>
      </header>

      <div
        ref={layoutRef}
        data-layout
        className={`relative min-h-0 flex-1 ${isResizingPanel ? "select-none" : ""}`}
      >
        <div className="relative flex h-full min-h-0 flex-col md:flex-row">
          <section className="absolute inset-0 z-0 md:relative md:min-w-0 md:flex-1">
            <StationMap
              ref={mapRef}
              stations={visibleStations}
              selectedFuel={selectedFuel}
              selectedStationId={selectedStationId}
              onStationSelect={selectStation}
              onLocateStatus={setLocateStatus}
              onUserLocationChange={(latitude, longitude) => {
                setLocateStatus(null)
                setReferenceLocation({ latitude, longitude })
                setSearchQuery("")
                setBrandFilter(null)
              }}
            />

            {locateStatus && (
              <div
                role="status"
                className="absolute left-3 right-14 z-10 rounded-xl border border-line/80 bg-surface/95 px-3 py-2.5 text-xs leading-relaxed text-ink-soft shadow-[0_6px_20px_rgba(18,34,31,0.14)] backdrop-blur-sm top-[8.5rem] md:left-auto md:right-5 md:top-auto md:bottom-20 md:max-w-xs"
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1">{locateStatus}</p>
                  <button
                    type="button"
                    onClick={() => setLocateStatus(null)}
                    className="shrink-0 text-muted transition hover:text-ink"
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => mapRef.current?.locateUser()}
              className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-line/70 bg-surface/95 text-petrol shadow-[0_6px_20px_rgba(18,34,31,0.14)] backdrop-blur-sm transition hover:bg-surface active:scale-95 top-[8.5rem] md:top-auto md:bottom-5 md:right-5"
              aria-label="Me géolocaliser"
            >
              <LocateIcon />
            </button>
          </section>

          <button
            type="button"
            aria-label="Redimensionner la liste et la carte"
            title="Glisser pour redimensionner · double-clic pour réinitialiser"
            onPointerDown={onPanelResizeStart}
            onPointerMove={onPanelResizeMove}
            onPointerUp={onPanelResizeEnd}
            onPointerCancel={onPanelResizeEnd}
            onDoubleClick={resetPanelWidth}
            className={`relative z-20 hidden w-1.5 shrink-0 cursor-col-resize touch-none items-stretch bg-line/70 transition hover:bg-petrol/50 md:flex ${
              isResizingPanel ? "bg-petrol" : ""
            }`}
          >
            <span className="absolute inset-y-0 -left-1 -right-1" />
          </button>

          <aside
            style={{ width: panelWidth }}
            className="relative z-10 hidden h-full shrink-0 border-l border-line/80 bg-surface md:flex md:flex-col"
          >
            <StationPanel {...panelProps} showFooter />
          </aside>

          <aside
            data-sheet
            style={mobileSheetStyle}
            className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden bg-surface md:hidden ${
              isSheetMerged
                ? "rounded-none border-0 shadow-none"
                : "rounded-t-[1.35rem] border border-line/50 border-b-0 shadow-[0_-12px_40px_rgba(18,34,31,0.14)]"
            } ${
              sheetHeightPx === null
                ? "transition-[height,border-radius,box-shadow] duration-200 ease-out"
                : "transition-none"
            }`}
          >
            {isSheetMerged && (
              <div
                className="shrink-0"
                style={{ height: mobileHeaderHeight }}
                aria-hidden
              />
            )}
            <StationPanel
              {...panelProps}
              showFooter={isSheetMerged}
              detailsDragHandle={detailsDragHandle}
              listChromeDragProps={listChromeDragProps}
              listOverscrollPull={listOverscrollPull}
            />
          </aside>
        </div>
      </div>

      {legalDocId && (
        <LegalModal
          docId={legalDocId}
          onClose={closeLegal}
          onNavigate={openLegal}
        />
      )}

      {myReportsOpen && authUser && (
        <MyReportsModal
          stations={stations}
          onClose={() => setMyReportsOpen(false)}
          onSelectStation={(stationId) => {
            const station = stations.find((s) => s.id === stationId)
            if (station) selectStation(station)
          }}
        />
      )}

      <AuthModal
        open={authOpen || authFlash === "ok"}
        onClose={() => {
          clearFlash()
          closeAuth()
        }}
        onSubmitEmail={requestMagicLink}
        flash={authFlash}
        onClearFlash={clearFlash}
      />
    </main>
  )
}

export default App
