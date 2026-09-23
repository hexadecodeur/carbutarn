# CarbuTarn — état du projet (handoff)

Document de reprise pour une nouvelle conversation Cursor.  
**Source de vérité : le dépôt au moment de la rédaction** (pas uniquement l’historique de chat).  
Date de référence : **2026-09-23**. Branche typique : `main`. Prod : [https://carbutarn.vercel.app](https://carbutarn.vercel.app).

Documents complémentaires (ne pas les remplacer, les croiser) :

| Doc | Rôle |
|-----|------|
| [`README.md`](../README.md) | Vue d’ensemble + démarrage |
| [`PHASE2_PARTICIPATORY.md`](./PHASE2_PARTICIPATORY.md) | Spec Phase 2 (partiellement datée — roadmap UI « à brancher » est **faite**) |
| [`STORE_SECURITY.md`](./STORE_SECURITY.md) | PWA / TWA / Play / tuiles / privacy |
| [`DEPLOY_HEADERS.md`](./DEPLOY_HEADERS.md) | CSP et en-têtes Vercel |

---

## 1. Produit

**CarbuTarn** = carte + liste des stations-service du **Tarn (81)** :

- Prix **officiels** (Open Data économie.gouv).
- Enseignes / noms via **OpenStreetMap** (`ref:FR:prix-carburants`), snapshot local prioritaire.
- Prix **constatés** (participatif) : magic link → signalements → consensus serveur 48 h.
- Mode carte **Officiel / Partagés** ; pins **RUPTURE** (rouge) si consensus rupture.
- Légal (CGU / confidentialité / mentions), thème clair/sombre, PWA installable.
- Éditeur / marque : **Hexa Décodeur** (`hexadecodeur@gmail.com`, https://hexadecodeur.fr/).

Périmètre géographique figé : département **81**.

---

## 2. Stack

| Couche | Techno | Notes |
|--------|--------|--------|
| Front | React 19, TypeScript, Vite 8, Tailwind 4 | Fonts Figtree + Syne |
| Carte | MapLibre GL | Tuiles MapTiler ou fallback Carto (client) |
| API | Hono 4 | `basePath("/api")` |
| DB | Neon Postgres + Drizzle ORM | HTTP driver `@neondatabase/serverless` |
| Auth | Magic link + JWT cookie | `jose`, Resend |
| Anti-bot | Cloudflare Turnstile | Obligatoire en prod |
| Hosting | Vercel | SPA `dist` + `api/index.js` + cron |
| Package manager | **pnpm** 12 | |

Scripts utiles (`package.json`) :

```bash
pnpm dev          # Vite :5173, proxy /api → :8787
pnpm dev:api      # Hono local
pnpm build        # tsc + vite + bundle API
pnpm bundle:api   # régénère api/index.js (à committer)
pnpm db:push      # Drizzle → Neon
pnpm sync:official
pnpm icons        # génère public/icons/*
```

---

## 3. Architecture runtime

```text
Navigateur (SPA + SW)
  │  same-origin /api/*
  ▼
Vercel rewrite  /api/(.*)  →  /api/index  (bundle ESM Hono)
  │
  ├─ Neon (users, tokens, stations_cache, official_prices, reports, observed_prices)
  ├─ Resend (e-mails magic link)
  ├─ Cloudflare Turnstile (siteverify)
  ├─ data.economie.gouv.fr (proxy stations + cron sync)
  ├─ geo.api.gouv.fr (proxy communes)
  └─ MapTiler / Carto (tuiles ; clé MapTiler côté serveur)

Front parallèle (hors Neon pour la liste live) :
  GET /api/stations  → Open Data instantané
  /osm-brands-tarn.json (+ cache localStorage) → enseignes
  Overpass seulement si VITE_OSM_OVERPASS=1
```

**Point critique déploiement** : le code source vit dans `server/`, mais Vercel exécute le **bundle versionné** `api/index.js`. Après toute modif serveur :

1. `pnpm bundle:api`
2. **Commit** `api/index.js`
3. Deploy

Sans ça, la prod reste sur l’ancien bundle. Le rewrite `vercel.json` est obligatoire : les catch-all `[...route]` Vercel ne matchent qu’un segment hors Next.js.

Dev local : `server/dev.ts` charge `.env.local` / `.env`, écoute `API_PORT` (défaut **8787**). Vite proxy `/api` → ce port.

---

## 4. Arborescence importante

```text
api/index.js                 # Bundle serverless — VERSIONNÉ, ne pas gitignorer
docs/                        # PHASE2, STORE_SECURITY, DEPLOY_HEADERS, ce fichier
public/
  manifest.webmanifest
  sw.js                      # SW minimal (pas de cache API/tuiles)
  osm-brands-tarn.json       # Snapshot enseignes Tarn
  theme-boot.js              # Thème avant paint (CSP : pas d’inline)
  icons/                     # 192, 512, apple-touch
  .well-known/assetlinks.json  # Template TWA (empreinte à remplir)
scripts/
  bundle-api.mjs
  fetch-osm-brands.mjs
  generate-pwa-icons.mjs
server/
  app.ts                     # Hono + CORS + bodyLimit + routes
  vercel-entry.ts            # handle(@hono/node-server/vercel)
  dev.ts
  types.ts                   # FuelTypeApi, AppEnv
  db/schema.ts               # Schéma Drizzle
  db/client.ts
  routes/                    # auth, stations, cities, map, cron
  lib/                       # auth, consensus, antiAbuse, turnstile, …
  scripts/sync-once.ts
src/
  App.tsx                    # Orchestration carte / liste / auth / partagés
  main.tsx                   # SW en PROD seulement
  components/                # UI (Station*, Auth, Legal, MyReports, Footer…)
  services/                  # fuelApi, stationsApi, osmBrands, participatoryApi, mapApi, cityApi
  hooks/                     # useAuth, useStations, useFilterPrefs, …
  content/legal.ts
  utils/                     # consensus prefs, couleurs, distances, Turnstile client…
vercel.json                  # build, rewrites, headers CSP, cron 04:00 UTC
.env.example                 # Contrat env (copier → .env.local)
```

Fichiers front clés Phase 2 :

- `src/services/participatoryApi.ts` — client auth / reports / observed
- `src/components/StationDetails.tsx` — Prix OK / Pas d’accord / Rupture
- `src/components/StationMap.tsx` — pins prix + RUPTURE
- `src/components/MyReportsModal.tsx` — historique compte
- `src/utils/filterPrefs.ts` — `mapPriceSource: "official" | "shared"`

---

## 5. Endpoints API

Base : `/api`. CORS : origine = `APP_URL` uniquement, `credentials: true`. Body max **16 KiB**.

| Méthode | Chemin | Auth | Rôle |
|---------|--------|------|------|
| `GET` | `/health` | Non | Healthcheck |
| `GET` | `/auth/turnstile` | Non | `{ siteKey }` (clé publique, pas de `VITE_`) |
| `POST` | `/auth/magic-link` | Non | `{ email, turnstileToken? }` → Resend |
| `GET` | `/auth/verify?token=` | Non | Redirect `#connexion-token=` (**ne consomme pas**) |
| `POST` | `/auth/verify` | Non | `{ token }` → cookie session |
| `GET` | `/auth/me` | Cookie opt. | `{ user }` ou `{ user: null }` ; 401 si cookie invalide |
| `GET` | `/auth/reports` | Cookie | Historique (max 200) |
| `POST` | `/auth/logout` | Cookie | Bump `session_version` + clear cookie |
| `DELETE` | `/auth/account` | Cookie | Supprime reports + tokens + user |
| `GET` | `/stations` | Non | Proxy Open Data Tarn (`Cache-Control: 300`) |
| `GET` | `/stations/observed` | Non | Prix/ruptures **publiés** (carte Partagés) |
| `GET` | `/stations/:id/prices` | Cookie opt. | Officiel + observed (fallback officiel) + `viewer` |
| `POST` | `/stations/:id/reports` | Cookie | Signalement + recompute consensus |
| `GET` | `/cities?q=` | Non | Proxy geo.api Tarn |
| `GET` | `/map/tiles` | Non | Config tuiles (MapTiler ou fallback serveur) |
| `GET` | `/cron/sync-official` | `Authorization: Bearer CRON_SECRET` | Sync Open Data → Neon |

### POST `/stations/:id/reports` — body

| Champ | Règle |
|-------|--------|
| `fuelType` | Un de `Gazole`, `SP95`, `E10`, `SP98`, `E85`, `GPLc` |
| `outage: true` | Rupture : pas de prix, `agreed` forcé false |
| `agreed: true` | Prix OK : stocke le prix **officiel** |
| `agreed: false` + `price` | Correction : fourchette **±10 %** du officiel, `0 < price ≤ 10` |

Cooldownponses utiles : `429` cooldown 2 h, `422` hors fourchette, `404` station/carburant absent du cache Neon (sync requise).

### GET `/stations/:id/prices` — `observed[]`

Pour chaque carburant **officiel** :

1. Si `outage` + `sampleCount ≥ 4` → `source: "outage"`
2. Sinon si consensus prix `sampleCount ≥ 3` → `source: "community"` + `price`
3. Sinon → `source: "official"` + prix officiel (**toujours une entrée affichable**)

`viewer.reportedFuelTypes` = carburants déjà signalés par l’utilisateur dans le cooldown 2 h.

---

## 6. Schéma DB (Drizzle → Neon)

Fichier : `server/db/schema.ts`. Appliquer : `pnpm db:push` (pas de migrations SQL versionnées actives dans le flux courant ; `drizzle.config` pointe `out: server/db/migrations`).

### `users`

| Colonne | Type | Notes |
|---------|------|--------|
| `id` | text PK | UUID |
| `email` | text unique | Normalisé lower |
| `reputation_score` | real défaut 1 | Réservé V2 |
| `session_version` | int défaut 0 | Invalide tous les JWT au logout / delete |
| `created_at` | timestamptz | |

### `magic_link_tokens`

| Colonne | Notes |
|---------|--------|
| `token_hash` | SHA-256(`MAGIC_LINK_SECRET:raw`) — raw jamais stocké |
| `ip_hash` | SHA-256 peppered — **jamais** l’IP en clair |
| `expires_at` | TTL 15 min |
| `consumed_at` | Consommation atomique UPDATE…RETURNING |

Indexes : `(email, created_at)`, `(ip_hash, created_at)` pour rate limit.

### `stations_cache` + `official_prices`

Remplis par le **cron** (et `pnpm sync:official`). PK prix : `(station_id, fuel_type)`.

Les signalements exigent que la station existe dans `stations_cache` → **premier sync obligatoire** après deploy / reset DB.

### `reports`

| Colonne | Notes |
|---------|--------|
| `price` | nullable (null si rupture) |
| `agreed` | boolean |
| `outage` | boolean défaut false |
| `latitude` / `longitude` | **plus écrits** (minimisation ; colonnes legacy nullable) |
| `weight` | réel, actuellement toujours **1** |
| `cooldown_bucket` | `floor(epochMs / 2h)` |

Contrainte unique : `(user_id, station_id, fuel_type, cooldown_bucket)` → 1 avis / compte / station / carburant / fenêtre 2 h (anti-race SQL).

### `observed_prices`

PK `(station_id, fuel_type)`. Recalculé à chaque report :

- `outage: true` + `sample_count` = poids rupture si ≥ 4
- sinon prix consensus (médiane pondérée) + `sample_count`
- sinon reset `sample_count: 0`, prix = officiel, `outage: false`

Les endpoints d’affichage **filtrent** encore `sample_count ≥ 3` (prix) / `≥ 4` (rupture) : une ligne avec peu d’avis n’est pas « publiée ».

---

## 7. Authentification (magic link)

Implémentation : `server/lib/auth.ts`, routes `server/routes/auth.ts`, middleware `attachSession` (`requireAuth.ts`).

### Flux

1. Front charge site key via `GET /auth/turnstile`, widget Turnstile.
2. `POST /auth/magic-link` → vérif Turnstile → rate limit → invalide anciens tokens non consommés → insert hash → e-mail Resend.
3. Lien dans l’e-mail : `{APP_URL}/#connexion-token=…` (**fragment** — pas dans les logs d’accès serveur).
4. Front lit le hash → `POST /auth/verify` → cookie `carbutarn_session`.
5. Anciens liens `GET /auth/verify?token=` : redirect fragment, **sans** consommer (évite prefetch e-mail).

### Session

- JWT HS256 (`SESSION_SECRET`), claims : `sub` = userId, `email`, `sv` = sessionVersion, `iss`/`aud` = `APP_URL`.
- Cookie : `HttpOnly`, `SameSite=Lax`, `Secure` si `APP_URL` https, `path=/`, TTL **7 jours**.
- À chaque requête : `attachSession` vérifie JWT + `users.session_version`. Invalide → cookie effacé + `sessionInvalid` (routes protégées → 401 ; `/prices` reste anonyme).
- Logout / delete account : `session_version++` puis clear cookie.

### Secrets

En production (`VERCEL_ENV=production` ou `NODE_ENV=production`) : secrets ≥ **32** chars, refus si préfixe `change-me`.

Dev : `MAGIC_LINK_DEV_LOG=1` logue le lien même si Resend est configuré. Sans `RESEND_API_KEY` en local : pas d’envoi (log seulement) ; en prod → erreur.

---

## 8. Turnstile

- Clés : `TURNSTILE_SITE_KEY` (publique via API), `TURNSTILE_SECRET_KEY` (serveur).
- **Pas** de préfixe `VITE_` (contrainte Vercel / fuite).
- Prod **sans** secret → `CAPTCHA_REQUIRED` (refus).
- Local sans secret → skip (rate limit seul).
- CSP : `script-src` / `frame-src` / `connect-src` → `https://challenges.cloudflare.com`.

---

## 9. Resend

- `RESEND_API_KEY`, `EMAIL_FROM` (ex. `CarbuTarn <noreply@domaine>`).
- Sans domaine vérifié : `onboarding@resend.dev` et destinataires limités au compte Resend.
- Contenu : texte + HTML, lien 15 min.

---

## 10. Système participatif & consensus

Constantes : `server/lib/antiAbuse.ts`, `server/lib/consensus.ts`.

| Paramètre | Valeur |
|-----------|--------|
| Fenêtre consensus | **48 h** (`CONSENSUS_WINDOW_MS`) |
| Cooldown signalement | **2 h** / user / station / fuel |
| Tolérance correction | **±10 %** du prix officiel |
| Epsilon cluster prix | **0,01 €/L** |
| Seuil prix publié | poids **≥ 3** |
| Seuil rupture publié | poids **≥ 4** |
| Poids par avis | **1** fixe (GPS client non crédité — spoofable) |

### Algorithme prix

1. Charger tous les reports non-rupture avec prix dans les 48 h (station + fuel).
2. `bestConsensusCluster` : fenêtre triée de diamètre ≤ 0,01 maximisant le poids (pas un « streak » chronologique).
3. Médiane pondérée du cluster ; `published` si poids ≥ 3.
4. Upsert `observed_prices`.

**Oui : les 3 avis n’ont pas besoin d’être consécutifs dans le temps** — seulement compatibles en prix dans la fenêtre 48 h (ex. 1,50 / 1,80 / 1,50 / 1,50 → consensus sur 1,50).

### Rupture

- Reports `outage: true` comptés à part.
- Si poids rupture ≥ 4 → `observed_prices.outage = true` (**prioritaire** sur le consensus prix).
- Sinon on retombe sur le chemin prix / fallback officiel.

### Consensus « infini »

Chaque nouveau signalement **recalcule** toute la fenêtre 48 h et **remplace** la ligne `observed_prices`. Un nouveau groupe ≥ 3 (ou rupture ≥ 4) écrase le précédent. Si plus assez d’avis → `sample_count` remis à 0, affichage = officiel.

### Carte « Partagés »

- Pref `mapPriceSource` dans `localStorage` (`carbutarn:filter-prefs`).
- Mode shared + carburant sélectionné → `GET /stations/observed` ; pins prix communauté ou texte **RUPTURE**.
- Mode officiel → prix Open Data enrichis côté client.
- Liste tri prix : carburants `Gazole | E10 | SP98 | E85` seulement (`LIST_FUEL_TYPES`) ; SP95/GPLc restent dans l’API détails.

### UI signalement

`StationDetails` : **Prix OK** / **Pas d’accord** (saisie) / **Rupture**. Auth requise (modal). Footer : Se connecter / Mes signalements / Déconnexion / Supprimer le compte.

---

## 11. Sécurité mise en place

| Mesure | Où |
|--------|-----|
| CORS strict `APP_URL` + credentials | `app.ts` |
| Body limit 16 KiB | `app.ts` |
| Cookie session HttpOnly / Lax / Secure | `auth.ts` |
| JWT iss/aud + `session_version` | `auth.ts` |
| Magic link hashé + fragment URL | `auth.ts` |
| Rate limit magic-link 3/email/15 min, 10/IP/h | `rateLimit.ts` (IP hashée) |
| Turnstile prod obligatoire | `turnstile.ts` |
| Cooldown reports + unique index | `antiAbuse` + schema |
| Fourchette ±10 % | `antiAbuse` |
| Cron : seul Bearer secret (pas `x-vercel-cron`) | `cron.ts` + `secureCompare` timing-safe |
| Pas d’IP en clair en DB | `ip_hash` |
| Pas de GPS stocké sur reports | schema + insert null |
| Erreurs API sans dump d’objets (URLs Neon) | `app.onError` |
| Proxies Open Data / geo.api | IP user non exposée aux tiers |
| Headers : nosniff, Referrer, DENY frame, HSTS, Permissions-Policy, CSP | `vercel.json` |
| SW n’intercepte pas `/api` ni tuiles | `sw.js` |
| Décision store : TWA/PWA same-origin, **pas** Capacitor `capacitor://` | `STORE_SECURITY.md` |

CSP `connect-src` : `'self'`, Turnstile, MapTiler, Carto, Vercel Analytics, Google Analytics (après consentement), Sentry (`*.ingest.sentry.io`).

---

## 12. Variables d’environnement

Voir `.env.example`. Local : `.env.local` (dotenv dans `dev.ts` / drizzle).

| Variable | Obligatoire prod | Rôle |
|----------|------------------|------|
| `SESSION_SECRET` | Oui (≥32) | JWT |
| `MAGIC_LINK_SECRET` | Oui (≥32) | Hash tokens + IP |
| `APP_URL` | Oui | CORS, iss/aud, liens (sans slash final) |
| `DATABASE_URL` | Oui | Neon |
| `RESEND_API_KEY` | Oui | E-mails |
| `EMAIL_FROM` | Recommandé | Expéditeur |
| `CRON_SECRET` | Oui (≥16) | Auth cron |
| `TURNSTILE_SITE_KEY` | Oui | Widget |
| `TURNSTILE_SECRET_KEY` | Oui | Verify |
| `MAPTILER_API_KEY` | Fortement reco stores | Tuiles ; hostnames restreints chez MapTiler |
| `SENTRY_DSN` | Non (reco prod) | Error Monitoring front ; injecté au build (pas de `VITE_`) |
| `MAGIC_LINK_DEV_LOG` | Non (dev) | Log lien terminal |
| `API_PORT` | Non | Dev API |
| `VITE_OSM_OVERPASS` | Non | `1` = Overpass live (désactivé par défaut / stores) |

Sur Vercel : Project Settings → Environment Variables (Production). `APP_URL` = URL prod réelle (custom domain si présent).

---

## 13. Déploiement Vercel / Neon

1. Repo Git connecté ; build = `pnpm build` (Vite + `bundle-api`).
2. `outputDirectory`: `dist` ; rewrites SPA + API (voir `vercel.json`).
3. Neon : `DATABASE_URL` ; `pnpm db:push` une fois (ou CI manuelle).
4. Cron Hobby : `0 4 * * *` → `GET /api/cron/sync-official` (Vercel envoie le Bearer si `CRON_SECRET` configuré correctement — vérifier la doc Vercel Cron auth ; le code n’accepte **que** `Authorization: Bearer`).
5. Après deploy : `GET /api/health` ; déclencher un sync manuel si cache vide.
6. Resend : domaine vérifié pour `EMAIL_FROM` réel.
7. Turnstile : hostnames localhost + prod.

**Checklist post-modif serveur** : `pnpm bundle:api` → commit `api/index.js` → push.

---

## 14. PWA

| Élément | État |
|---------|------|
| Manifest | `public/manifest.webmanifest` (standalone, thème `#1f5c52`) |
| Icônes | `public/icons/` — `pnpm icons` |
| SW | `public/sw.js` — network-first navigate, pas de cache API |
| Enregistrement | `src/main.tsx` **PROD seulement** |
| Apple | `apple-touch-icon`, meta web-app |

« Ajouter à l’écran d’accueil » fonctionne en HTTPS. Pas de stratégie offline riche (volontaire).

---

## 15. Futur TWA / Play Store (décisions)

Document détaillé : [`STORE_SECURITY.md`](./STORE_SECURITY.md).

**Retenu** : Trusted Web Activity (Android) / PWA ou wrapper **same-origin** iOS.  
**Évité** : Capacitor avec origine `capacitor://` (casse le cookie `SameSite=Lax` ; forcerait `SameSite=None` + CSRF ou Bearer JWT = refonte).

À faire pour Play :

1. Domaine stable = `APP_URL`.
2. Remplir `sha256_cert_fingerprints` dans `public/.well-known/assetlinks.json` (template package `fr.hexadecodeur.carbutarn`).
3. Bubblewrap depuis le manifest prod.
4. Publier `assetlinks.json` **avant** soumission ; valider Digital Asset Links.
5. `MAPTILER_API_KEY` (OSM tile.org interdit à fort trafic store).
6. Formulaires Privacy / Data safety (e-mail, signalements ; pas d’analytics ; suppression compte in-app).

iOS court terme : PWA Safari. Store App Store = même contrainte same-origin.

---

## 16. Ce qui est terminé

- [x] Carte / liste Tarn, géoloc, recherche communes, tri distance/prix, itinéraires
- [x] Enseignes OSM (snapshot + cache ; Overpass opt-in)
- [x] Thème clair/sombre, légal, footer mobile 2 lignes, liens Hexa / mailto
- [x] API Hono + Neon + Drizzle + bundle Vercel + cron sync
- [x] Magic link Resend + Turnstile + session révocable
- [x] Reports Prix OK / correction / Rupture + consensus 48 h
- [x] Affichage prix : fallback officiel si pas de consensus
- [x] Carte Officiel / Partagés + pins RUPTURE
- [x] Mes signalements + suppression de compte
- [x] Proxies stations / cities / map tiles
- [x] PWA (manifest, icônes, SW)
- [x] Headers / CSP Vercel
- [x] Template assetlinks TWA
- [x] Vercel Web Analytics (`@vercel/analytics/react`)
- [x] Google Analytics 4 + bandeau consentement (refus par défaut)
- [x] Sentry Error Monitoring (`@sentry/react`, prod + `SENTRY_DSN`)

Derniers commits notables (indicatif) : `21100d4` outage + affichage ; `2d79943` base PWA ; Phase 2 auth/consensus antérieure.

---

## 17. Ce qui reste à faire

### Stores / prod dure

- [ ] Secrets prod forts (pas `change-me`) vérifiés
- [ ] `MAPTILER_API_KEY` + hostnames ; ne pas s’appuyer sur OSM.org tiles
- [ ] Domaine custom optionnel = `APP_URL`
- [ ] Remplir fingerprints `assetlinks.json` + Bubblewrap TWA
- [ ] Tester suppression de compte sur device réel
- [ ] Privacy questionnaires Apple / Google

### Produit / technique (non bloquant MVP)

- [ ] Réputation / géofence attestée (**V2** — prévu, non implémenté)
- [ ] Nettoyer doc `PHASE2_PARTICIPATORY.md` (roadmap UI obsolète)
- [ ] Unifier tuiles serveur (voir vigilance ci-dessous)
- [ ] Éventuel rate limit plus large hors magic-link
- [ ] Migrations Drizzle versionnées si besoin d’équipes multi-env

### Hors scope actuel

- Capacitor / Bearer JWT
- Multi-départements

---

## 18. Points de vigilance

1. **`api/index.js` désynchronisé** — oubli fréquent après edit `server/`. Toujours rebundler + commit.

2. **Deux fichiers tuiles** — divergence réelle dans le dépôt :
   - `server/lib/mapTiles.ts` (**importé** par `routes/map.ts`, présent dans le bundle) → fallback **`tile.openstreetmap.org`**, `provider: "osm"`.
   - `server/lib/mapteTiles.ts` (**non branché**, typo de nom) → fallback **Carto**, aligné avec `STORE_SECURITY.md` et `src/services/mapApi.ts`.
   - Le client mappe tout provider non-maptiler en label `"carto"` mais **utilise le `tileUrl` serveur** → sans `MAPTILER_API_KEY`, la prod peut encore servir OSM.org. **À corriger** : remplacer le contenu de `mapTiles.ts` par la version Carto (ou réimporter), supprimer le doublon, `pnpm bundle:api`.

3. **Sync Neon obligatoire** avant tout report (`stations_cache` / `official_prices`). Cron 04:00 UTC ; Hobby = 1×/jour.

4. **Open Data `limit=100`** dans sync / proxy — OK pour le Tarn aujourd’hui ; surveiller si le dataset dépasse.

5. **Consensus écrit même si non publié** — `recomputeObserved` peut upsert avec `sample_count < 3` ; l’UI filtre. Pas bloquant mais à connaître pour le debug SQL.

6. **Poids « proche ×2 »** mentionné dans d’anciennes docs : **abandonné** — poids fixe 1.

7. **Turnstile + Resend** absents en local OK ; absents en prod = auth cassée.

8. **Cookie Lax + TWA same-origin** : ne pas passer en Capacitor sans refonte auth.

9. **`VITE_OSM_OVERPASS=1`** : utile en debug ; ne pas activer pour un build store (snapshot suffit).

10. **PHASE2.md** et parties du README peuvent être en retard sur Rupture / mes signalements / fallback officiel — ce fichier `PROJECT_STATE.md` prime pour le handoff.

11. **Windows / chemins** : doublons `server\lib\…` vs `server/lib/…` dans l’explorateur = mêmes fichiers ; attention aux typos (`mapteTiles`).

12. **Cron auth** : ne jamais faire confiance à un header Vercel spoofable ; garder Bearer + `timingSafeEqual`.

---

## 19. Commandes de reprise rapide

```bash
pnpm install
cp .env.example .env.local   # remplir Neon, secrets, Resend, Turnstile
pnpm db:push
pnpm sync:official           # ou cron Bearer en prod
pnpm dev:api                 # terminal 1
pnpm dev                     # terminal 2 → http://localhost:5173
```

Health : `http://localhost:8787/api/health`.

Après edit serveur :

```bash
pnpm bundle:api
# puis commit api/index.js
```

---

## 20. Contacts / marque

- Produit : CarbuTarn  
- Éditeur : Hexa Décodeur — hexadecodeur@gmail.com — https://hexadecodeur.fr/  
- Licence : MIT (`LICENSE`)

---

*Fin du handoff. Pour le packaging store, commencer par `docs/STORE_SECURITY.md`. Pour les règles métier participatives, croiser §10 ici et `server/lib/consensus.ts`.*
