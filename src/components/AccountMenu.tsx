import { useEffect, useId, useRef, useState } from "react"
import type { AuthUser } from "../hooks/useAuth"
import ThemeSwitch from "./ThemeSwitch"

type AccountMenuProps = {
  user: AuthUser | null
  authLoading?: boolean
  onOpenAuth: () => void
  onLogout: () => void
  onDeleteAccount: () => void
  onOpenMyReports: () => void
  /** Style compact pour le header mobile */
  compact?: boolean
}

function AccountMenu({
  user,
  authLoading = false,
  onOpenAuth,
  onLogout,
  onDeleteAccount,
  onOpenMyReports,
  compact = false,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (rootRef.current?.contains(target)) return
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  if (authLoading) {
    return (
      <span
        className={`shrink-0 text-muted ${compact ? "text-[11px]" : "text-xs"}`}
      >
        …
      </span>
    )
  }

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <ThemeSwitch />
        <button
          type="button"
          onClick={onOpenAuth}
          className={`shrink-0 font-semibold text-petrol transition hover:text-petrol-deep ${
            compact ? "text-[11px]" : "text-sm"
          }`}
        >
          Se connecter
        </button>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        title={user.email}
        className={`max-w-[10rem] truncate font-semibold text-ink transition hover:text-petrol sm:max-w-[14rem] ${
          compact ? "text-[11px]" : "text-sm"
        }`}
      >
        {user.email}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-[120] mt-2 min-w-[13.5rem] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[0_12px_32px_rgba(18,34,31,0.16)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onOpenMyReports()
            }}
            className="flex w-full px-3.5 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-paper"
          >
            Mes signalements
          </button>

          <div
            role="none"
            className="flex items-center justify-between gap-3 border-y border-line/70 px-3.5 py-2.5"
          >
            <span className="text-sm font-medium text-ink-soft">Mode</span>
            <ThemeSwitch />
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full px-3.5 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-paper"
          >
            Se déconnecter
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDeleteAccount()
            }}
            className="flex w-full px-3.5 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Supprimer mon compte
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
