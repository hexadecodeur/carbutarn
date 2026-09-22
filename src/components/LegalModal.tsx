import { LEGAL_DOCS, LEGAL_LINKS, type LegalDocId } from "../content/legal"

type LegalModalProps = {
  docId: LegalDocId
  onClose: () => void
  onNavigate: (id: LegalDocId) => void
}

function LegalModal({ docId, onClose, onNavigate }: LegalModalProps) {
  const doc = LEGAL_DOCS[docId]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:max-h-[85dvh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line/80 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-petrol">
              CarbuTarn
            </p>
            <h2
              id="legal-title"
              className="mt-1 font-display text-xl font-bold tracking-tight text-ink"
            >
              {doc.title}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Mis à jour le {doc.updatedAt}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-deep text-lg text-ink-soft transition hover:bg-line"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <nav
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-line/70 bg-paper/50 px-3 py-2"
          aria-label="Documents légaux"
        >
          {LEGAL_LINKS.map((link) => {
            const active = link.id === docId
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-petrol text-surface"
                    : "text-ink-soft hover:bg-surface"
                }`}
              >
                {link.label}
              </button>
            )
          })}
        </nav>

        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-6">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="font-display text-sm font-bold text-ink">
                  {section.heading}
                </h3>
                <div className="mt-2 space-y-2">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.heading}-${index}`}
                      className="text-sm leading-relaxed text-ink-soft"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LegalModal
