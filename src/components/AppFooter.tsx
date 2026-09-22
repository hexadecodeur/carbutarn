import { LEGAL_LINKS, type LegalDocId } from "../content/legal"
import ThemeSwitch from "./ThemeSwitch"

type AppFooterProps = {
  onOpen: (id: LegalDocId) => void
  compact?: boolean
}

function AppFooter({ onOpen, compact = false }: AppFooterProps) {
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

        <ThemeSwitch />
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
