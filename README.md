# CarbuTarn

Application web cartographique pour consulter les prix des carburants dans le Tarn.

CarbuTarn s’appuie sur les données publiques françaises (prix officiels) et OpenStreetMap (enseignes) pour afficher les stations-service, leurs carburants, leurs prix et un itinéraire vers la station.

> Projet en cours de développement. Le mode participatif (prix constatés) est prévu en Phase 2 — voir [docs/PHASE2_PARTICIPATORY.md](docs/PHASE2_PARTICIPATORY.md).
>
> En-têtes HTTP recommandés pour la prod : [docs/DEPLOY_HEADERS.md](docs/DEPLOY_HEADERS.md).

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

- Prix constatés par les utilisateurs (à côté des prix officiels)
- Confirmation / désaccord + rectification
- Anti-abus serveur (comptes, rate limit, consensus, géofence soft)

## Stack

- React · TypeScript · Vite · Tailwind CSS
- MapLibre GL JS · OpenStreetMap

## Données

| Source | Usage |
|--------|--------|
| [data.economie.gouv.fr](https://data.economie.gouv.fr) — flux instantané prix carburants | Stations, adresses, prix, services |
| [OpenStreetMap](https://www.openstreetmap.org) (Overpass) | Enseignes / noms + coordonnées plus précises (quand l’écart &lt; 200 m) |
| [geo.api.gouv.fr](https://geo.api.gouv.fr) | Recherche de communes du Tarn |

## Architecture

```text
Open Data carburants ──► fuelApi.ts ──┐
                                      ├──► stationsApi.ts ──► Station[] ──► MapLibre + liste / fiche
Overpass (enseignes) ──► osmBrands.ts ─┘
geo.api.gouv.fr ───────► cityApi.ts ──► recherche ville
```

## Développement

```bash
pnpm install
pnpm dev
```

## Licence

MIT — développé par Hexa Décodeur.
