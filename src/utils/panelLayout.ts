const STORAGE_KEY = "carbutarn:desktop-panel-width"

export const DEFAULT_PANEL_WIDTH = 420
export const MIN_PANEL_WIDTH = 280
export const MAX_PANEL_WIDTH = 720
export const MIN_MAP_WIDTH = 360

export function loadPanelWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PANEL_WIDTH
    const value = Number(raw)
    if (!Number.isFinite(value)) return DEFAULT_PANEL_WIDTH
    return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, value))
  } catch {
    return DEFAULT_PANEL_WIDTH
  }
}

export function savePanelWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(width)))
  } catch {
    // ignore
  }
}

export function clampPanelWidth(
  width: number,
  layoutWidth: number,
): number {
  const maxForLayout = Math.max(
    MIN_PANEL_WIDTH,
    layoutWidth - MIN_MAP_WIDTH,
  )
  const max = Math.min(MAX_PANEL_WIDTH, maxForLayout)
  return Math.min(max, Math.max(MIN_PANEL_WIDTH, width))
}
