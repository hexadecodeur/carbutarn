import { LEGAL_LINKS, type LegalDocId } from "../content/legal"
import ThemeSwitch from "./ThemeSwitch"
import type { AuthUser } from "../hooks/useAuth"

type AppFooterProps = {
  onOpen: (id: LegalDocId) => void
  compact?: boolean
  user?: AuthUser | null
  authLoading?: boolean
  onOpenAuth?: () => void
  onLogout?: () => void
  onDeleteAccount?: () => void
}

function AppFooter({
  onOpen,
  compact = false,
  user = null,
  authLoading = false,
  onOpenAuth,
  onLogout,
  onDeleteAccount,
}: AppFooterProps) {
  return (
    <footer
      className={`shrink-0 border-t border-line/80 bg-paper/40 ${
        compact ? "px-3 py-2" : "px-4 py-2.5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <nav
          className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5"
          aria-label="Informations légales"
        >
          {LEGAL_LINKS.map((link, index) => (
            <span key={link.id} className="flex items-center gap-2.5">
              {index > 0 && (
                <span className="text-line" aria-hidden>
                  ·
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpen(link.id)}
                className="text-[11px] font-medium text-muted transition hover:text-petrol"
              >
                {link.label}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {onOpenAuth && (
            <div className="flex max-w-[12rem] flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 sm:max-w-[16rem]">
              {authLoading ? (
                <span className="text-[10px] text-muted">…</span>
              ) : user ? (
                <>
                  <span
                    className="truncate text-[10px] font-medium text-ink-soft"
                    title={user.email}
                  >
                    {user.email}
                  </span>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="shrink-0 text-[10px] font-semibold text-muted transition hover:text-petrol"
                    >
                      Sortir
                    </button>
                  )}
                  {onDeleteAccount && (
                    <button
                      type="button"
                      onClick={onDeleteAccount}
                      className="shrink-0 text-[10px] font-semibold text-muted transition hover:text-red-700 dark:hover:text-red-400"
                    >
                      Supprimer le compte
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-[10px] font-semibold text-petrol transition hover:text-petrol-deep"
                >
                  Se connecter
                </button>
              )}
            </div>
          )}
          <ThemeSwitch />
        </div>
      </div>

      {!compact && (
        <p className="mt-1 text-center text-[10px] text-muted/80">
          © {new Date().getFullYear()} Hexa Décodeur · CarbuTarn
        </p>
      )}
    </footer>
  )
}

export default AppFooter
