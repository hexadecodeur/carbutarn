const STORAGE_KEY = "carbutarn:theme"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "Clair" },
  { id: "dark", label: "Sombre" },
  { id: "system", label: "Système" },
]

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system"
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (isThemePreference(raw)) return raw
  } catch {
    // ignore
  }
  return "system"
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // ignore
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === "system" ? getSystemTheme() : pref
}

/** Applique le thème résolu sur <html> (data-theme = light|dark). */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}
