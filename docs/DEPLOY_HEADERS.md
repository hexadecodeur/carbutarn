# Déploiement — en-têtes HTTP recommandés

Checklist à configurer **côté hébergeur** (Netlify, Cloudflare Pages, nginx, etc.) lors de la mise en production. Non applicable en `pnpm dev`.

## Sécurité

| En-tête | Valeur suggérée |
|---------|-----------------|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (requis pour les tuiles OSM) |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `geolocation=(self), camera=(), microphone=()` |

## Content-Security-Policy (brouillon)

Adapter selon l’hébergeur et les domaines réels :

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

- Les tuiles OSM exigent un `Referer` valide → ne pas utiliser `Referrer-Policy: no-referrer`.
- Si tu ajoutes MapTiler / un autre fournisseur de tuiles, mets à jour `img-src` et `connect-src`.
- Phase 2 : ajouter l’origine de l’API backend dans `connect-src`.
