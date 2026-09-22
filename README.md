# CarbuTarn

Application web cartographique pour consulter les prix des carburants dans le Tarn.

Prix officiels (Open Data) + enseignes OpenStreetMap, et **prix constatés** via signalements authentifiés (magic link).

Prod : [carbutarn.vercel.app](https://carbutarn.vercel.app) · détail Phase 2 : [docs/PHASE2_PARTICIPATORY.md](docs/PHASE2_PARTICIPATORY.md) · en-têtes : [docs/DEPLOY_HEADERS.md](docs/DEPLOY_HEADERS.md).

## Fonctionnalités

- Carte interactive des stations-service du Tarn
- Géolocalisation
- Prix officiels (Open Data) + enseignes OSM (`ref:FR:prix-carburants`)
- Adresse, services, horaires automate 24h
- Recherche par ville (Tarn)
- Classement distance / prix (Gazole, E10, SP98, E85)
- Itinéraire « Y aller » (Google Maps / Apple Maps)
- Prix constatés : connexion magic link, **Prix OK** / **Pas d’accord**, consensus serveur (médiane 48 h, anti-abus)
- Interface responsive

## Stack

| Couche | Techno |
|--------|--------|
| Front | React · TypeScript · Vite · Tailwind · MapLibre |
| API | Hono (serverless Vercel) · Neon Postgres · Drizzle · Resend |
| Hébergement | Vercel (SPA + `api/[...route].js` + cron quotidien) |

## Données

| Source | Usage |
|--------|--------|
| [data.economie.gouv.fr](https://data.economie.gouv.fr) — flux prix carburants | Stations, adresses, prix, services (front + sync Neon) |
| [OpenStreetMap](https://www.openstreetmap.org) (Overpass) | Enseignes / noms + coordonnées (écart &lt; 200 m) |
| [geo.api.gouv.fr](https://geo.api.gouv.fr) | Communes du Tarn |

## Architecture

```text
Open Data ──► fuelApi.ts (front)
         └─► cron /api/cron/sync-official ──► Neon (official_prices)

Overpass ──► osmBrands.ts
geo.api   ──► cityApi.ts

Front ──► /api/* (Hono) ──► magic link · reports · observed prices
```

Entrée serverless : bundle versionné `api/[...route].js` (généré par `pnpm bundle:api` / `pnpm build`). **À committer** après changement serveur — sinon Vercel ne déploie pas `/api` (404).

## Développement

```bash
pnpm install
cp .env.example .env.local   # Neon + Resend + secrets
pnpm db:push                 # schéma Postgres
pnpm dev:api                 # API http://localhost:8787
pnpm dev                     # Vite (proxy /api → :8787)
```

Autres scripts :

```bash
pnpm sync:official   # sync Open Data → Neon (local)
pnpm bundle:api      # régénère api/[...route].js
pnpm db:studio       # Drizzle Studio
```

Health check local : [http://localhost:8787/api/health](http://localhost:8787/api/health).

## Déploiement Vercel

1. Repo connecté + variables de `.env.example` (dont `APP_URL` = URL prod)
2. Neon (marketplace) + domaine Resend pour `EMAIL_FROM`
3. Deploy Git — le build lance Vite + `bundle-api`
4. Vérifier [GET /api/health](https://carbutarn.vercel.app/api/health)
5. Premier sync : `GET /api/cron/sync-official` avec `Authorization: Bearer $CRON_SECRET` (cron Hobby : `0 4 * * *`)

Après modif du code `server/` : `pnpm bundle:api` puis commit de `api/[...route].js`.

## Licence

MIT — développé par Hexa Décodeur.
