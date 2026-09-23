/**
 * Cloudflare Turnstile — requis en production si TURNSTILE_SECRET_KEY est défini.
 * En local sans clé : skip (rate limit seul).
 */

type TurnstileResponse = {
  success: boolean
  "error-codes"?: string[]
}

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim())
}

export function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  )
}

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()

  if (!secret) {
    if (isProductionRuntime()) {
      // Prod sans Turnstile : on refuse (stores / anti-abus)
      throw new Error("CAPTCHA_REQUIRED")
    }
    return
  }

  if (!token || typeof token !== "string" || token.length > 2048) {
    throw new Error("CAPTCHA_FAILED")
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  })
  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp)
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  )

  if (!response.ok) {
    throw new Error("CAPTCHA_FAILED")
  }

  const data = (await response.json()) as TurnstileResponse
  if (!data.success) {
    throw new Error("CAPTCHA_FAILED")
  }
}
