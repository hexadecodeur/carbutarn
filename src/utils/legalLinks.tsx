import type { ReactNode } from "react"

const MAIL = "hexadecodeur@gmail.com"
const SITE_URL = "https://hexadecodeur.fr/"
const BRAND = "Hexa Décodeur"

const LINK_PATTERN = new RegExp(
  `(${MAIL.replace(".", "\\.")}|${BRAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
  "g",
)

const linkClass =
  "font-medium text-petrol underline decoration-petrol/40 underline-offset-2 transition hover:text-petrol-deep"

/** Rend e-mail et « Hexa Décodeur » cliquables dans les textes légaux. */
export function linkifyLegalText(text: string): ReactNode {
  const parts = text.split(LINK_PATTERN)
  if (parts.length === 1) return text

  return parts.map((part, index) => {
    if (part === MAIL) {
      return (
        <a key={`mail-${index}`} href={`mailto:${MAIL}`} className={linkClass}>
          {MAIL}
        </a>
      )
    }
    if (part === BRAND) {
      return (
        <a
          key={`brand-${index}`}
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {BRAND}
        </a>
      )
    }
    return <span key={`t-${index}`}>{part}</span>
  })
}
