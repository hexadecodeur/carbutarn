import * as Sentry from "@sentry/react"
import type { Breadcrumb, ErrorEvent, Event } from "@sentry/react"

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
/** Indices GPS / lat-lon dans du texte libre */
const GPS_LABEL_RE =
  /(?:lat(?:itude)?|lon(?:gitude)?|lng|coords?)["'\s:=(-]*(-?\d{1,3}\.\d{3,})/gi
const COORD_PAIR_RE = /(-?\d{1,2}\.\d{4,})\s*[,;\s]\s*(-?\d{1,3}\.\d{4,})/g
const MAGIC_TOKEN_RE = /(?:#?connexion-token=)([^&\s#]+)/gi
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi
const SESSION_COOKIE_RE = /(?:^|[\s;,])(carbutarn_session)=([^;,\s]+)/gi

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-csrf-token",
])

const SENSITIVE_KEY_RE =
  /email|authorization|cookie|token|password|latitude|longitude|^lat$|^lng$|^lon$/i

function scrubString(value: string): string {
  return value
    .replace(MAGIC_TOKEN_RE, "connexion-token=[redacted]")
    .replace(BEARER_RE, "Bearer [redacted]")
    .replace(SESSION_COOKIE_RE, "$1=[redacted]")
    .replace(EMAIL_RE, "[email]")
    .replace(GPS_LABEL_RE, "[coords]")
    .replace(COORD_PAIR_RE, "[coords],[coords]")
}

function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value
  if (typeof value === "string") return scrubString(value)
  if (typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) {
    return value.map((item) => scrubUnknown(item, depth + 1))
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SENSITIVE_KEY_RE.test(key)) {
        out[key] = "[redacted]"
        continue
      }
      out[key] = scrubUnknown(nested, depth + 1)
    }
    return out
  }
  return value
}

function scrubRequest(request: Event["request"]): Event["request"] {
  if (!request) return request

  const headers = request.headers
    ? Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => {
          if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
            return [key, "[redacted]"]
          }
          return [
            key,
            typeof value === "string" ? scrubString(value) : value,
          ]
        }),
      )
    : undefined

  return {
    ...request,
    url: request.url ? scrubString(request.url) : request.url,
    headers,
    cookies: undefined,
    query_string: undefined,
    data: request.data ? scrubUnknown(request.data) : request.data,
  }
}

function scrubEvent(event: ErrorEvent): ErrorEvent {
  return {
    ...event,
    message: event.message ? scrubString(event.message) : event.message,
    request: scrubRequest(event.request),
    user: event.user
      ? {
          ...event.user,
          email: undefined,
          ip_address: undefined,
          username: undefined,
        }
      : event.user,
    extra: event.extra
      ? (scrubUnknown(event.extra) as ErrorEvent["extra"])
      : event.extra,
    contexts: event.contexts
      ? (scrubUnknown(event.contexts) as ErrorEvent["contexts"])
      : event.contexts,
    tags: event.tags
      ? (scrubUnknown(event.tags) as ErrorEvent["tags"])
      : event.tags,
    breadcrumbs: event.breadcrumbs?.map((crumb) => scrubBreadcrumb(crumb)),
    exception: event.exception
      ? {
          ...event.exception,
          values: event.exception.values?.map((item) => ({
            ...item,
            value: item.value ? scrubString(item.value) : item.value,
          })),
        }
      : event.exception,
  }
}

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return {
    ...breadcrumb,
    message: breadcrumb.message
      ? scrubString(breadcrumb.message)
      : breadcrumb.message,
    data: breadcrumb.data
      ? (scrubUnknown(breadcrumb.data) as Record<string, unknown>)
      : breadcrumb.data,
  }
}

/** Initialise Sentry (erreurs uniquement) — no-op hors prod / sans DSN. */
export function initSentry() {
  const dsn = typeof __SENTRY_DSN__ === "string" ? __SENTRY_DSN__ : ""
  if (!import.meta.env.PROD || !dsn.trim()) return

  Sentry.init({
    dsn: dsn.trim(),
    environment: "production",
    // v11 : remplace sendDefaultPii:false (plus restrictif que les defaults v11)
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
    },
    // Error Monitoring only — pas de tracing / replay / logs
    tracesSampleRate: 0,
    integrations: (integrations) =>
      integrations.filter((integration) => {
        const name = integration.name
        return name !== "BrowserTracing" && name !== "Replay"
      }),
    beforeBreadcrumb(breadcrumb) {
      return scrubBreadcrumb(breadcrumb)
    },
    beforeSend(event) {
      return scrubEvent(event)
    },
  })
}
