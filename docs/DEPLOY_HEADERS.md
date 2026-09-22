# Déploiement — en-têtes HTTP (Vercel)

Les en-têtes de base sont déjà dans `vercel.json`. La CSP ci-dessous peut être ajoutée plus tard (à tester : MapLibre / workers).

## Déjà configuré (`vercel.json`)

| En-tête | Valeur |
|---------|--------|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (tuiles OSM) |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `geolocation=(self), camera=(), microphone=()` |

## Content-Security-Policy (brouillon)

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://tile.openstreetmap.org;
connect-src 'self'
  https://data.economie.gouv.fr
  https://geo.api.gouv.fr
  https://overpass-api.de
  https://overpass.kumi.systems
  https://overpass.private.coffee;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
```

Notes :

- L’API Phase 2 est **same-origin** (`/api`) → déjà couverte par `'self'`.
- Tuiles OSM : ne pas utiliser `Referrer-Policy: no-referrer`.
- Resend / Neon sont appelés **côté serveur** uniquement (pas dans `connect-src` navigateur).
