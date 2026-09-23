# Déploiement — en-têtes HTTP (Vercel)

Configurée dans `vercel.json`.

| En-tête | Valeur |
|---------|--------|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `geolocation=(self), camera=(), microphone=()` |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` |
| `Content-Security-Policy` | voir ci-dessous |

## Content-Security-Policy

```text
default-src 'self';
script-src 'self' https://challenges.cloudflare.com https://va.vercel-scripts.com
  https://www.googletagmanager.com https://www.google-analytics.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://challenges.cloudflare.com
  https://api.maptiler.com
  https://basemaps.cartocdn.com
  https://*.basemaps.cartocdn.com
  https://va.vercel-scripts.com
  https://vitals.vercel-insights.com
  https://www.googletagmanager.com
  https://www.google-analytics.com
  https://analytics.google.com
  https://*.google-analytics.com
  https://*.analytics.google.com
  https://*.ingest.sentry.io
  https://*.sentry.io;
worker-src 'self' blob:;
frame-src https://challenges.cloudflare.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Notes :

- API, stations et communes sont **same-origin** (`/api`) → `'self'`.
- Tuiles carte : MapLibre les charge en `fetch` → hosts dans `connect-src` (MapTiler + Carto). **Ne pas** utiliser `tile.openstreetmap.org` (policy OSM / souvent bloqué).
- Prod store : définir `MAPTILER_API_KEY` (hostnames restreints). Sans clé : fallback Carto.
- Turnstile : scripts / frames Cloudflare.
- Vercel Web Analytics : `va.vercel-scripts.com` (script) + `vitals.vercel-insights.com` (événements) ; les beacons same-origin `/_vercel/insights/*` restent couverts par `'self'`.
- Google Analytics 4 : chargé **uniquement après consentement** (bandeau) ; hosts GTM / GA dans `script-src` et `connect-src`. Pas de script inline (CSP).
- Sentry Error Monitoring : SDK bundlé (pas de CDN script) ; `connect-src` → `*.ingest.sentry.io` / `*.sentry.io`. Init **prod uniquement** via `SENTRY_DSN` (injecté au build, pas de préfixe `VITE_`).
- Source maps : générées en `hidden` au build si `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` ; uploadées puis **supprimées** de `dist/` (`filesToDeleteAfterUpload`). Région EU : `SENTRY_URL=https://de.sentry.io`.
- `theme-boot.js` est un fichier externe (pas de script inline) pour rester compatible CSP.
- Cookie `carbutarn_session` : HttpOnly, Secure (si `APP_URL` https), SameSite=Lax ; invalidé au logout via `session_version`.
