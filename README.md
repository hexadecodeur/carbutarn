# CarbuTarn

Application web cartographique pour consulter les prix des carburants dans le Tarn.

CarbuTarn s’appuie sur les données publiques françaises (prix officiels) et OpenStreetMap (enseignes) pour afficher les stations-service, leurs carburants, leurs prix et un itinéraire vers la station.

> Projet en cours de développement. Phase 2 (prix participatifs) : [docs/PHASE2_PARTICIPATORY.md](docs/PHASE2_PARTICIPATORY.md).
>
> En-têtes / déploiement Vercel : [docs/DEPLOY_HEADERS.md](docs/DEPLOY_HEADERS.md).

## Fonctionnalités actuelles

- Carte interactive des stations-service du Tarn
- Géolocalisation de l’utilisateur
- Prix officiels des carburants (Open Data)
- Enseignes via OpenStreetMap (`ref:FR:prix-carburants`)
- Adresse exacte de chaque station
- Recherche par ville (Tarn)
- Classement par distance ou par prix (Gazole, E10, SP98, E85)
- Synchronisation carte / fiche station
- Fiche détaillée (prix, services, horaires automate 24h)
- Itinéraire « Y aller » (Google Maps / Apple Maps)
- Interface responsive desktop / mobile

## Fonctionnalités prévues (Phase 2)

- Prix constatés (magic link + consensus serveur)
- Confirmation / désaccord + rectification
- Anti-abus (rate limit, fourchette, géofence soft)

## Stack

- **Front** : React · TypeScript · Vite · Tailwind · MapLibre
- **API (Phase 2)** : Hono sur Vercel · Neon Postgres · Resend (magic link)
- **Hébergement** : Vercel

## Données

| Source | Usage |
|--------|--------|
| [data.economie.gouv.fr](https://data.economie.gouv.fr) — flux instantané prix carburants | Stations, adresses, prix, services |
| [OpenStreetMap](https://www.openstreetmap.org) (Overpass) | Enseignes / noms + coordonnées plus précises (quand l’écart &lt; 200 m) |
| [geo.api.gouv.fr](https://geo.api.gouv.fr) | Recherche de communes du Tarn |

## Architecture

```text
Open Data ──► fuelApi.ts (front, lecture directe Phase 1)
         └─► cron /api/cron/sync-official ──► Neon (Phase 2)

Overpass ──► osmBrands.ts
geo.api   ──► cityApi.ts

Front ──► /api/* (Hono) ──► auth magic link · reports · observed prices
```

## Développement

```bash
pnpm install
cp .env.example .env.local   # Neon + Resend + secrets
pnpm db:push                 # schéma Postgres
pnpm dev:api                 # API http://localhost:8787
pnpm dev                     # Vite (proxy /api → :8787)
```

Sync manuelle Open Data → Neon :

```bash
pnpm sync:official
```

## Déploiement Vercel

1. Importer le repo sur Vercel
2. Ajouter les variables de `.env.example`
3. Brancher une base Neon (marketplace Vercel)
4. Domaine vérifié Resend pour `EMAIL_FROM`
5. Premier deploy puis `GET /api/cron/sync-official` (ou attendre le cron 6 h)

## Licence

MIT — développé par Hexa Décodeur.
