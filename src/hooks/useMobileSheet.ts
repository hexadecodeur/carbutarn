import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react"

export type SheetSnap = "collapsed" | "peek" | "half" | "full"

/** Hauteur minimale (poignée seule) en px */
const COLLAPSED_PX = 28

const SHEET_HEIGHT: Record<SheetSnap, string> = {
  collapsed: `${COLLAPSED_PX}px`,
  peek: "30%",
  half: "50%",
  full: "100%",
}

/** Au-delà de ce ratio, la feuille fusionne avec le header mobile */
const SHEET_MERGE_RATIO = 0.88

const SNAP_ORDER: SheetSnap[] = ["collapsed", "peek", "half", "full"]

const LAUNCH_KEY = "carbutarn:has-launched"

function isFirstLaunch(): boolean {
  try {
    return localStorage.getItem(LAUNCH_KEY) !== "1"
  } catch {
    return false
  }
}

function markLaunched() {
  try {
    localStorage.setItem(LAUNCH_KEY, "1")
  } catch {
    /* ignore */
  }
}

function nearestSnap(ratio: number, heightPx: number): SheetSnap {
  if (heightPx <= COLLAPSED_PX + 20 || ratio < 0.12) return "collapsed"
  if (ratio < 0.4) return "peek"
  if (ratio < 0.72) return "half"
  return "full"
}

function minSheetHeight(layoutHeight: number) {
  return Math.min(COLLAPSED_PX, layoutHeight)
}

export function useMobileSheet() {
  const sheetDrag = useRef<{
    startY: number
    startHeight: number
    moved: boolean
    deferred: boolean
    target: HTMLElement
  } | null>(null)
  const listPullStartHeight = useRef<number | null>(null)
  const sheetHeightRef = useRef<number | null>(null)
  const suppressSheetClickRef = useRef(false)

  const [sheetSnap, setSheetSnap] = useState<SheetSnap>(() =>
    typeof window !== "undefined" && isFirstLaunch() ? "full" : "half",
  )
  const [sheetHeightPx, setSheetHeightPx] = useState<number | null>(null)
  const [layoutHeightPx, setLayoutHeightPx] = useState(
    () => (typeof window !== "undefined" ? window.innerHeight : 800),
  )
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(136)
  const layoutRef = useRef<HTMLDivElement>(null)
  const mobileHeaderRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isFirstLaunch()) markLaunched()
  }, [])

  useEffect(() => {
    const el = layoutRef.current
    if (!el || typeof ResizeObserver === "undefined") return

    const update = () => setLayoutHeightPx(el.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = mobileHeaderRef.current
    if (!el || typeof ResizeObserver === "undefined") return

    const update = () =>
      setMobileHeaderHeight(el.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function cycleSheet() {
    const index = SNAP_ORDER.indexOf(sheetSnap)
    setSheetSnap(SNAP_ORDER[(index + 1) % SNAP_ORDER.length])
    setSheetHeightPx(null)
  }

  function isInteractiveTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false
    const interactive = target.closest(
      "button, a, input, label, [role='tab']",
    ) as HTMLElement | null
    if (!interactive) return false
    return !interactive.hasAttribute("data-sheet-drag")
  }

  function suppressNextClick() {
    suppressSheetClickRef.current = true
    const suppress = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      document.removeEventListener("click", suppress, true)
    }
    document.addEventListener("click", suppress, true)
  }

  function onSheetPointerDown(event: PointerEvent<HTMLElement>) {
    const sheet = event.currentTarget.closest(
      "[data-sheet]",
    ) as HTMLElement | null
    if (!sheet) return

    const deferred = isInteractiveTarget(event.target)
    const startHeight = sheet.getBoundingClientRect().height

    sheetDrag.current = {
      startY: event.clientY,
      startHeight,
      moved: false,
      deferred,
      target: event.currentTarget,
    }
    sheetHeightRef.current = startHeight

    if (!deferred) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  function onSheetPointerMove(event: PointerEvent<HTMLElement>) {
    if (!sheetDrag.current) return

    const layout = event.currentTarget.closest(
      "[data-layout]",
    ) as HTMLElement | null
    if (!layout) return

    const delta = sheetDrag.current.startY - event.clientY
    if (Math.abs(delta) > 6) {
      if (sheetDrag.current.deferred) {
        sheetDrag.current.deferred = false
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          /* ignore */
        }
        event.preventDefault()
      }
      sheetDrag.current.moved = true
    }

    if (sheetDrag.current.deferred) return

    const layoutHeight = layout.getBoundingClientRect().height
    const next = Math.min(
      layoutHeight,
      Math.max(
        minSheetHeight(layoutHeight),
        sheetDrag.current.startHeight + delta,
      ),
    )
    sheetHeightRef.current = next
    setSheetHeightPx(next)
  }

  function onSheetPointerUp(event: PointerEvent<HTMLElement>) {
    if (!sheetDrag.current) return

    const didDrag = sheetDrag.current.moved
    const layout = event.currentTarget.closest(
      "[data-layout]",
    ) as HTMLElement | null
    const height =
      sheetHeightRef.current ??
      (
        event.currentTarget.closest("[data-sheet]") as HTMLElement | null
      )?.getBoundingClientRect().height ??
      0
    const layoutHeight = layout?.getBoundingClientRect().height ?? 1

    if (didDrag) {
      finishSheetResize(height, layoutHeight)
      suppressNextClick()
    }

    sheetDrag.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onSheetChromeClick(event: MouseEvent<HTMLElement>) {
    if (suppressSheetClickRef.current) {
      suppressSheetClickRef.current = false
      return
    }
    if (isInteractiveTarget(event.target)) return
    cycleSheet()
  }

  function finishSheetResize(height: number, layoutHeight: number) {
    suppressSheetClickRef.current = true
    setSheetSnap(nearestSnap(height / layoutHeight, height))
    setSheetHeightPx(null)
    sheetHeightRef.current = null
  }

  function resetSheetToDefault() {
    setSheetSnap("half")
    setSheetHeightPx(null)
    sheetHeightRef.current = null
  }

  function openSheetFull() {
    setSheetSnap("full")
    setSheetHeightPx(null)
  }

  function openSheetHalf() {
    setSheetSnap("half")
    setSheetHeightPx(null)
  }

  function onListOverscrollPullStart(startHeight: number) {
    listPullStartHeight.current = startHeight
    sheetHeightRef.current = startHeight
  }

  function onListOverscrollPullMove(deltaDown: number, layoutHeight: number) {
    const startHeight = listPullStartHeight.current
    if (startHeight === null) return

    const next = Math.min(
      layoutHeight,
      Math.max(minSheetHeight(layoutHeight), startHeight - deltaDown),
    )
    sheetHeightRef.current = next
    setSheetHeightPx(next)
  }

  function onListOverscrollPullEnd(layoutHeight: number) {
    const startHeight = listPullStartHeight.current
    listPullStartHeight.current = null
    if (startHeight === null) return

    const height = sheetHeightRef.current ?? startHeight
    finishSheetResize(height, layoutHeight)
  }

  const isSheetMerged =
    sheetHeightPx !== null
      ? sheetHeightPx / layoutHeightPx >= SHEET_MERGE_RATIO
      : sheetSnap === "full"

  const mobileSheetStyle = {
    height:
      sheetHeightPx !== null ? `${sheetHeightPx}px` : SHEET_HEIGHT[sheetSnap],
  }

  return {
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
  }
}
