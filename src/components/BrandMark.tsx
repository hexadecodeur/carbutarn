type BrandMarkProps = {
  className?: string
}

/** Monogramme CarbuTarn — pompe stylisée. */
function BrandMark({ className = "h-9 w-9" }: BrandMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="40" height="40" rx="12" fill="#1f5c52" />
      <path
        d="M12 28V14.5c0-1.4 1.1-2.5 2.5-2.5H21c1.4 0 2.5 1.1 2.5 2.5V28"
        stroke="#fffcf7"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M23.5 16h3.2c.9 0 1.6.7 1.6 1.6V24c0 1.2.8 2.2 2 2.4"
        stroke="#e09b1b"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="18.5" r="1.6" fill="#e09b1b" />
    </svg>
  )
}

export default BrandMark
