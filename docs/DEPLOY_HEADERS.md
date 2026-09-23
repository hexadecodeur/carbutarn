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
script-src 'self' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://challenges.cloudflare.com
  https://api.maptiler.com
  https://basemaps.cartocdn.com
  https://*.basemaps.cartocdn.com;
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
- `theme-boot.js` est un fichier externe (pas de script inline) pour rester compatible CSP.
- Cookie `carbutarn_session` : HttpOnly, Secure (si `APP_URL` https), SameSite=Lax ; invalidé au logout via `session_version`.
