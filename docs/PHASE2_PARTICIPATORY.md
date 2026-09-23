# Phase 2 — Mode participatif (prix constatés)

Document d’architecture. Le front Phase 1 affiche déjà un placeholder « Prix constatés » dans `StationDetails`.

## Décisions figées

| Sujet | Choix |
|--------|--------|
| Auth | **Magic link** (e-mail, pas de mot de passe) |
| Hébergement | **Vercel** (SPA Vite + fonctions serverless `/api`) |
| Base | **Neon Postgres** (serverless, intégration Vercel) |
| E-mails | **Resend** |
| Sync Open Data | **Vercel Cron** → `GET /api/cron/sync-official` |
| Framework API | **Hono** (`server/` + `api/index.js` + rewrite `/api/*`) |

## Objectif produit

| Colonne | Source | Éditable |
|---------|--------|----------|
| Prix officiel | Open Data (sync cron → Postgres) | Non |
| Prix constaté | Consensus des signalements | Via signalement |

Actions : **Prix OK** | **Pas d’accord** → saisie d’un prix + horodatage.

## Pourquoi un backend

Toute validation client est contournable. Anti-abus **uniquement serveur**.

## Flux

```text
Vercel Cron ──► /api/cron/sync-official ──► official_prices (Neon)
                                                    │
Front ──GET /api/stations/:id/prices───────────────┤
Front ──POST /api/auth/magic-link ──► Resend        │
Front ──GET  /api/auth/verify?token=… ──► cookie    │
Front ──POST /api/stations/:id/reports (cookie) ──► reports
                                                    │
                                              médiane 48h
                                                    │
                                              observed_prices
```

## Règles anti-abus (MVP)

1. Compte via magic link (session cookie `HttpOnly`, TTL 7 j, `session_version` révocable)
2. Rate limit magic-link (3 / e-mail / 15 min, 10 / IP / h) + Turnstile en prod
3. 1 signalement / station / carburant / bucket 2 h / compte (contrainte unique SQL)
4. Fourchette ±10 % du prix officiel si correction
5. Poids fixe 1 (GPS client non crédité — spoofable)
6. Consensus 48 h : regrouper les prix à ±0,010 €/L ; publier dès poids ≥ 3
7. Prix non publiés : absents du JSON public
8. Réputation / géofence attestée = V2

## Endpoints

| Méthode | Chemin | Auth |
|---------|--------|------|
| `POST` | `/api/auth/magic-link` | Non — `{ email, turnstileToken? }` + RL |
| `GET` | `/api/auth/verify?token=` | Non — redirige vers `#connexion-token=` (ne consomme pas) |
| `POST` | `/api/auth/verify` | Non — `{ token }` pose le cookie |
| `GET` | `/api/auth/me` | Cookie |
| `GET` | `/api/auth/reports` | Cookie — historique signalements du compte |
| `POST` | `/api/auth/logout` | Cookie — bump `session_version` |
| `DELETE` | `/api/auth/account` | Cookie — suppression compte + reports |
| `GET` | `/api/stations` | Non — proxy Open Data |
| `GET` | `/api/stations/:id/prices` | Optionnel |
| `POST` | `/api/stations/:id/reports` | Cookie — `{ fuelType, agreed, price? }` |
| `GET` | `/api/cities?q=` | Non — proxy geo.api |
| `GET` | `/api/cron/sync-official` | `Authorization: Bearer CRON_SECRET` uniquement |
| `GET` | `/api/health` | Non |

Stores / packaging : [STORE_SECURITY.md](./STORE_SECURITY.md).


## Structure code

```text
api/index.js            # Bundle (pnpm bundle:api) — DOIT être versionné
                        # + vercel.json rewrite /api/(.*) → /api/index
                        # (les catch-all [...route] ne matchent qu’1 segment hors Next)
server/
  vercel-entry.ts       # handle(@hono/node-server/vercel) + app
  app.ts                # Routes
  db/schema.ts          # Drizzle
  db/client.ts          # Neon
  routes/*.ts
  lib/auth.ts           # Magic link + session
  lib/antiAbuse.ts
  lib/consensus.ts
  lib/syncOfficial.ts
```

## Variables d’environnement

Voir `.env.example`. Sur Vercel : Project Settings → Environment Variables (+ Neon / Resend).

## Dev local

```bash
pnpm install
# Copier .env.example → .env.local et renseigner Neon + Resend + secrets
pnpm db:push          # schéma Neon
pnpm dev:api          # API :8787
pnpm dev              # Vite (proxy /api → :8787)
```

## UI Phase 1 déjà en place

Brancher les boutons de `StationDetails` quand auth + `GET/POST` prix sont opérationnels.

## Roadmap d’implémentation

1. ✅ Décisions + scaffold API / schéma / stubs
2. Brancher Neon + Resend (env prod)
3. Finaliser magic link + cookie session
4. Sync cron Open Data
5. Reports + consensus
6. Front : login + brancher « Prix constatés »
7. Headers CSP (`docs/DEPLOY_HEADERS.md`) + `connect-src` same-origin `/api`
