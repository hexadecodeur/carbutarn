import { useEffect, useState, type ReactElement } from "react"
import {
  applyResolvedTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
} from "../utils/themePrefs"

const ORDER: ThemePreference[] = ["dark", "system", "light"]

function MoonIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M8 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

const ICONS: Record<ThemePreference, () => ReactElement> = {
  dark: MoonIcon,
  system: SystemIcon,
  light: SunIcon,
}

const LABELS: Record<ThemePreference, string> = {
  dark: "Sombre",
  system: "Système",
  light: "Clair",
}

function ThemeSwitch() {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    typeof window !== "undefined" ? loadThemePreference() : "system",
  )

  useEffect(() => {
    applyResolvedTheme(resolveTheme(preference))
    saveThemePreference(preference)

    if (preference !== "system") return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyResolvedTheme(resolveTheme("system"))
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [preference])

  const index = ORDER.indexOf(preference)
  const ActiveIcon = ICONS[preference]
  const next = ORDER[(index + 1) % ORDER.length]

  function cycle() {
    setPreference(ORDER[(index + 1) % ORDER.length])
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Thème : ${LABELS[preference]}. Appuyer pour passer à ${LABELS[next]}`}
      title={`Thème : ${LABELS[preference]}`}
      className="relative h-[22px] w-[52px] shrink-0 rounded-full border border-line/90 bg-paper-deep/80 p-0.5"
    >
      <span className="pointer-events-none absolute inset-0.5 z-0 grid grid-cols-3">
        {ORDER.map((option) => {
          const Icon = ICONS[option]
          const selected = preference === option
          return (
            <span
              key={option}
              className={`flex items-center justify-center ${
                selected ? "opacity-0" : "text-muted/60"
              }`}
              aria-hidden
            >
              <Icon />
            </span>
          )
        })}
      </span>

      <span
        className="pointer-events-none absolute top-0.5 left-0.5 z-10 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-surface text-ink shadow-sm transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${index * 16}px)` }}
        aria-hidden
      >
        <ActiveIcon />
      </span>
    </button>
  )
}

export default ThemeSwitch
