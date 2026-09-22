import { useRef, useState, type PointerEvent } from "react"
import {
  clampPanelWidth,
  DEFAULT_PANEL_WIDTH,
  loadPanelWidth,
  savePanelWidth,
} from "../utils/panelLayout"

export function usePanelWidth() {
  const panelDrag = useRef<{
    startX: number
    startWidth: number
  } | null>(null)

  const [panelWidth, setPanelWidth] = useState(
    () =>
      typeof window !== "undefined" ? loadPanelWidth() : DEFAULT_PANEL_WIDTH,
  )
  const [isResizingPanel, setIsResizingPanel] = useState(false)

  function onPanelResizeStart(event: PointerEvent<HTMLButtonElement>) {
    panelDrag.current = {
      startX: event.clientX,
      startWidth: panelWidth,
    }
    setIsResizingPanel(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPanelResizeMove(event: PointerEvent<HTMLButtonElement>) {
    if (!panelDrag.current) return

    const layout = event.currentTarget.closest("[data-layout]") as HTMLElement | null
    const layoutWidth =
      layout?.getBoundingClientRect().width ?? window.innerWidth
    const delta = panelDrag.current.startX - event.clientX
    const next = clampPanelWidth(
      panelDrag.current.startWidth + delta,
      layoutWidth,
    )
    setPanelWidth(next)
  }

  function onPanelResizeEnd() {
    if (!panelDrag.current) return
    setPanelWidth((current) => {
      savePanelWidth(current)
      return current
    })
    panelDrag.current = null
    setIsResizingPanel(false)
  }

  function resetPanelWidth() {
    setPanelWidth(DEFAULT_PANEL_WIDTH)
    savePanelWidth(DEFAULT_PANEL_WIDTH)
  }

  return {
    panelWidth,
    isResizingPanel,
    onPanelResizeStart,
    onPanelResizeMove,
    onPanelResizeEnd,
    resetPanelWidth,
  }
}
