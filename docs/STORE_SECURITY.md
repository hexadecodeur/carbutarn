# Stores mobiles — sécurité & packaging

## Décision packaging (todo 7)

**Recommandation : Trusted Web Activity (Android) / Progressive Web App ou SFSafariViewController same-origin (iOS), pas Capacitor avec origine `capacitor://`.**

| Option | Auth cookie | CORS | Verdict |
|--------|-------------|------|---------|
| **TWA / PWA same-origin** (`https://ton-domaine`) | Cookie `SameSite=Lax` OK | 1 origine = `APP_URL` | **Retenu** |
| Capacitor WebView | Cookie souvent non envoyé en POST cross-site | Il faudrait `SameSite=None` + CSRF | **Éviter** pour l’auth actuelle |
| Capacitor + Bearer JWT | Possible | CORS élargi | Refonte auth (hors scope immédiat) |

Conséquences :

1. Déployer sur un domaine https stable (`APP_URL`).
2. Wrapper store = shell qui charge **exactement** cette URL (Digital Asset Links / Apple Associated Domains).
3. Ne pas élargir CORS à `*`. Ne pas passer le cookie en `SameSite=None` sans CSRF token.

## Tuiles carte (todo 8)

`tile.openstreetmap.org` est **interdit** pour une app store à fort trafic (usage policy OSM).

1. Créer un compte [MapTiler](https://www.maptiler.com/).
2. Restreindre la clé aux hostnames (`localhost`, `carbutarn.vercel.app`, domaine custom).
3. Variables (local + Vercel Production) — **pas** de préfixe `VITE_` :

```env
MAPTILER_API_KEY=your_maptiler_key
```

L’API expose `GET /api/map/tiles` → URL `streets-v2` + attribution. Sans clé : fallback OSM (dev seulement).

4. Ne pas activer `VITE_OSM_OVERPASS=1` en build store (snapshot `public/osm-brands-tarn.json` suffit).

## Proxies API déjà en place

| Client | Avant | Après |
|--------|-------|-------|
| Stations | `data.economie.gouv.fr` | `GET /api/stations` |
| Communes | `geo.api.gouv.fr` | `GET /api/cities?q=` |
| Enseignes | Overpass | Snapshot local (+ Overpass opt-in) |

L’IP de l’utilisateur n’est plus exposée directement à data.gouv / geo.api.

## Formulaires Privacy / Data safety

### Apple App Privacy (résumé)

| Donnée | Collectée | Liée à l’identité | Tracking |
|--------|-----------|------------------|----------|
| E-mail | Oui (compte) | Oui | Non |
| Identifiant utilisateur | Oui | Oui | Non |
| Localisation précise | Non côté serveur (carte = appareil seulement) | — | Non |
| Données d’utilisation | Non (pas d’analytics) | — | Non |

Usage strings iOS (si géoloc native plus tard) :

- `NSLocationWhenInUseUsageDescription` : centrer la carte / distances, jamais pour les signalements.

### Google Play Data safety

- Collecte : e-mail, ID compte, signalements (station / carburant / prix / horodatage).
- Pas de vente de données.
- Suppression de compte : in-app (« Supprimer le compte ») + e-mail support.
- Partage : Vercel, Neon, Resend, Cloudflare Turnstile ; tuiles MapTiler si configuré.

## Checklist avant soumission

- [ ] `SESSION_SECRET` / `MAGIC_LINK_SECRET` ≥ 32 chars (pas `change-me`)
- [ ] `CRON_SECRET` ≥ 16 chars + cron Vercel envoie `Authorization: Bearer`
- [ ] `MAPTILER_API_KEY` (hostnames localhost + prod)
- [ ] `RESEND_API_KEY` + `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` en production
- [ ] `VITE_MAP_TILE_URL` sous licence store
- [ ] `pnpm db:push` (colonnes `session_version`, `cooldown_bucket`, `ip_hash`)
- [ ] `pnpm bundle:api` + commit `api/index.js`
- [ ] Tester suppression de compte sur device réel
- [ ] TWA / Associated Domains pointent vers `APP_URL`
