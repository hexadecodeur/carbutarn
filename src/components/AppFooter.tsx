import { LEGAL_LINKS, type LegalDocId } from "../content/legal"

type AppFooterProps = {
  onOpen: (id: LegalDocId) => void
  onManageCookies?: () => void
  compact?: boolean
}

function LegalNav({
  onOpen,
  onManageCookies,
}: {
  onOpen: (id: LegalDocId) => void
  onManageCookies?: () => void
}) {
  return (
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
      {onManageCookies && (
        <span className="flex items-center gap-2.5">
          <span className="text-line" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={onManageCookies}
            className="text-[11px] font-medium text-muted transition hover:text-petrol"
          >
            Cookies
          </button>
        </span>
      )}
    </nav>
  )
}

function AppFooter({
  onOpen,
  onManageCookies,
  compact = false,
}: AppFooterProps) {
  return (
    <footer
      className={`shrink-0 border-t border-line/80 bg-paper/40 ${
        compact ? "px-3 py-2" : "px-4 py-2.5"
      }`}
    >
      {compact ? (
        <LegalNav onOpen={onOpen} onManageCookies={onManageCookies} />
      ) : (
        <>
          <LegalNav onOpen={onOpen} onManageCookies={onManageCookies} />
          <p className="mt-1 text-center text-[10px] text-muted/80">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://hexadecodeur.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-line/80 underline-offset-2 transition hover:text-petrol"
            >
              Hexa Décodeur
            </a>{" "}
            · CarbuTarn
          </p>
        </>
      )}
    </footer>
  )
}

export default AppFooter
