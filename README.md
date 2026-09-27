# ⛽ CarbuTarn

**CarbuTarn** est une application web permettant de consulter et comparer les prix des carburants dans le **Tarn (81)**.

Elle combine les **données publiques officielles** avec une couche participative permettant aux utilisateurs de confirmer un prix, signaler un prix constaté à la pompe ou indiquer une rupture.

👉 **Application en production :** https://carbutarn.vercel.app

---

## Fonctionnalités

- 🗺️ Carte interactive des stations-service du Tarn
- 📍 Géolocalisation de l'utilisateur
- 🔎 Recherche par commune
- 💰 Comparaison des prix par carburant
  - Gazole
  - E10
  - SP98
  - E85
- ↕️ Classement par prix ou distance
- 🏪 Informations sur les stations :
  - adresse
  - enseigne
  - services
  - horaires / automate 24h
- 🧭 Ouverture d'un itinéraire vers la station
- 🕒 Affichage de la date de dernière mise à jour des prix
- ⚠️ Signalement visuel des données anciennes
- 👥 Prix constatés par la communauté
- ✅ Confirmation d'un prix avec **Prix OK**
- ✏️ Proposition d'un prix différent avec **Pas d'accord**
- 🚫 Signalement d'une rupture
- 🔐 Authentification sans mot de passe par magic link
- 📱 Interface responsive et préparation PWA

L'application reste utilisable sans compte pour consulter les stations et les prix.  
L'authentification est principalement utilisée pour les fonctionnalités participatives.

---

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | React · TypeScript · Vite · Tailwind CSS |
| Cartographie | MapLibre GL |
| API | Hono · TypeScript |
| Base de données | PostgreSQL · Neon |
| ORM | Drizzle ORM |
| Authentification | Magic link · Resend |
| Protection anti-abus | Cloudflare Turnstile · rate limiting |
| Monitoring | Sentry |
| Analytics | Vercel Analytics |
| Hébergement | Vercel |

---

## Architecture

CarbuTarn utilise une architecture **same-origin** : le frontend n'interroge pas directement les différentes sources externes nécessaires au fonctionnement de l'application.

```text
                    ┌──────────────────────┐
                    │      React / Vite    │
                    │       Frontend       │
                    └──────────┬───────────┘
                               │
                            /api/*
                               │
                    ┌──────────▼───────────┐
                    │      Hono API        │
                    │   Vercel Serverless  │
                    └─────┬─────────┬──────┘
                          │         │
                 ┌────────▼───┐  ┌──▼─────────────┐
                 │   Neon     │  │ Sources externes│
                 │ PostgreSQL │  │ Open Data / Map │
                 └────────────┘  └─────────────────┘
```

Les stations consommées par le frontend passent notamment par :

```text
React
  │
  └──► /api/stations
           │
           ├──► données officielles synchronisées
           └──► enrichissement des stations
```

La synchronisation des données officielles est également exécutée automatiquement par un cron Vercel.

---

## Données

### Prix des carburants

Les données officielles proviennent du jeu de données public français :

**Prix des carburants en France — flux instantané**

Source : DGCCRF / data.economie.gouv.fr.

Ces données sont régulièrement synchronisées côté serveur puis utilisées par l'application.

### Enseignes et informations complémentaires

Certaines informations complémentaires concernant les stations peuvent provenir d'**OpenStreetMap**, notamment pour l'identification ou l'enrichissement des enseignes.

### Communes

La recherche des communes du Tarn repose sur les données de l'API géographique française.

---

## Fonctionnement participatif

CarbuTarn permet de compléter les données officielles avec des observations faites directement par les utilisateurs.

Pour une station et un carburant donnés, un utilisateur authentifié peut :

- confirmer le prix affiché ;
- indiquer qu'il n'est plus correct ;
- saisir un prix constaté ;
- signaler une rupture.

Les signalements sont stockés séparément des prix officiels.

Un mécanisme de consensus côté serveur permet ensuite de produire des **prix constatés** lorsqu'un nombre suffisant de signalements cohérents est disponible.

Les prix officiels restent ainsi distincts des informations communautaires.

---

## Sécurité et protection contre les abus

CarbuTarn étant une application publique proposant des contributions utilisateurs, plusieurs protections ont été mises en place.

### Authentification

L'authentification fonctionne par **magic link** envoyé par email via Resend.

Les sessions utilisent des tokens signés et une version de session côté base de données permettant leur invalidation.

### Magic links

Les demandes de connexion disposent notamment de :

- limitation des requêtes ;
- protection par Cloudflare Turnstile en production ;
- expiration des tokens ;
- consommation atomique des tokens ;
- stockage sous forme de hash.

### Contributions

Les signalements disposent de mécanismes anti-abus, notamment :

- cooldown par utilisateur / station / carburant ;
- contrainte d'unicité côté base de données ;
- validation côté serveur ;
- consolidation des signalements avant publication d'un prix constaté.

### Données personnelles

CarbuTarn applique une logique de minimisation des données.

La géolocalisation sert notamment à calculer la proximité des stations, mais les coordonnées GPS précises ne sont pas conservées dans les nouveaux signalements.

Les adresses IP utilisées pour certaines protections anti-abus ne sont pas conservées en clair.

### Sécurité HTTP

Le déploiement applique notamment :

- Content Security Policy (CSP)
- HSTS
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- limitation de la taille des requêtes API

---

## Résilience de la cartographie

La carte interactive utilise **MapLibre GL** et nécessite WebGL2.

La disponibilité de WebGL2 est vérifiée avant l'initialisation de la carte.

Si le navigateur ou l'appareil ne permet pas son utilisation, CarbuTarn affiche un fallback dédié sans empêcher l'utilisateur d'accéder à la liste des stations.

Les erreurs inattendues restent suivies via Sentry.

---

## Base de données

Les principales tables sont :

```text
users
magic_link_tokens
stations_cache
official_prices
reports
observed_prices
```

### `official_prices`

Contient les prix provenant de la source officielle.

### `reports`

Contient les observations et confirmations envoyées par les utilisateurs.

### `observed_prices`

Contient les valeurs consolidées issues du système participatif.

Cette séparation permet de ne jamais confondre directement une donnée officielle avec une observation communautaire.

---

## Développement local

### Prérequis

- Node.js
- pnpm
- PostgreSQL / Neon

### Installation

```bash
git clone https://github.com/hexadecodeur/carbutarn.git
cd carbutarn

pnpm install
cp .env.example .env.local
```

Configurer ensuite les variables d'environnement nécessaires.

### Base de données

```bash
pnpm db:push
```

### API

```bash
pnpm dev:api
```

L'API locale est disponible sur :

```text
http://localhost:8787
```

Health check :

```text
GET /api/health
```

### Frontend

Dans un second terminal :

```bash
pnpm dev
```

Vite utilise le proxy local pour transmettre les appels `/api/*` vers l'API.

---

## Scripts utiles

```bash
pnpm dev
```

Lance le frontend Vite.

```bash
pnpm dev:api
```

Lance l'API locale.

```bash
pnpm build
```

Compile TypeScript, construit le frontend et génère le bundle serverless.

```bash
pnpm bundle:api
```

Régénère le bundle API Vercel.

```bash
pnpm sync:official
```

Déclenche localement une synchronisation des données officielles vers Neon.

```bash
pnpm db:push
```

Synchronise le schéma Drizzle avec PostgreSQL.

```bash
pnpm db:studio
```

Ouvre Drizzle Studio.

```bash
pnpm icons
```

Génère les icônes utilisées pour la PWA.

---

## Déploiement

CarbuTarn est actuellement déployé sur **Vercel**.

Le build de production exécute :

```bash
pnpm build
```

qui réalise :

```text
TypeScript
    ↓
Vite build
    ↓
bundle API
    ↓
Vercel
```

Les routes `/api/*` sont redirigées vers l'entrée serverless Hono.

La synchronisation automatique des prix officiels utilise un cron Vercel :

```text
0 4 * * *
```

Endpoint :

```text
/api/cron/sync-official
```

L'accès au cron est protégé par un secret côté serveur.

---

## PWA / mobile

CarbuTarn est conçu en priorité pour une utilisation mobile.

Le projet comprend notamment :

- manifest web ;
- icônes dédiées ;
- service worker ;
- affichage standalone ;
- préparation d'un packaging Android basé sur une approche PWA/TWA.

L'objectif est de conserver autant que possible la même application web et la même origine pour les versions navigateur et mobile.

---

## Monitoring

La production est surveillée avec :

- **Sentry** pour le suivi des erreurs frontend ;
- **Vercel** pour les erreurs et logs serverless ;
- **Vercel Analytics** pour les statistiques d'utilisation.

---

## Sources et licences des données

CarbuTarn utilise plusieurs sources externes dont les conditions et licences restent propres à leurs fournisseurs.

### Données carburants

DGCCRF — Prix des carburants en France  
Licence Ouverte 2.0 (Etalab)

### OpenStreetMap

Les données OpenStreetMap sont mises à disposition sous licence ODbL.

### Code source

Le code de CarbuTarn est distribué sous licence **MIT**.

---

## Auteur

Développé par **Hexa Décodeur**.

🌐 https://hexadecodeur.fr

Projet développé dans le Tarn, avec l'objectif de construire un outil local simple, gratuit et sans publicité.
