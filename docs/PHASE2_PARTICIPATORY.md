# Phase 2 — Mode participatif (prix constatés)

Document d’architecture pour le futur backend. **Non implémenté** dans le client actuel : la fiche station affiche déjà un placeholder « Prix constatés ».

## Objectif produit

Pour chaque carburant d’une station :

| Colonne | Source | Éditable |
|---------|--------|----------|
| Prix officiel | Open Data gouvernement | Non |
| Prix constaté | Consensus des signalements utilisateurs | Via signalement |

Actions utilisateur : **Prix OK** | **Pas d’accord** → saisie d’un prix corrigé + horodatage.

## Pourquoi un backend est obligatoire

Toute validation côté client peut être contournée. Un utilisateur malveillant pourrait sinon publier n’importe quel prix. Les règles anti-abus doivent vivre **uniquement sur le serveur**.

## Flux

```text
Open Data (sync cron)
        │
        ▼
   official_prices
        │
User report ──► API ──► règles anti-abus ──► reports
                              │
                              ▼
                     consensus (médiane)
                              │
                              ▼
                      observed_prices ──► App UI
```

## Règles anti-abus (serveur)

1. **Compte léger** — email magique ou OAuth (recommandé vs fingerprint anonyme).
2. **Rate limit** — 1 signalement / station / carburant / 24 h par compte.
3. **Fourchette de prix** — rejet si hors ±15 % du prix officiel (ou bornes absolues FR réalistes).
4. **Géofence soft** — signalement boosté si GPS &lt; ~300 m de la station ; pas bloquant total (privacy).
5. **Consensus** — prix affiché = médiane des signalements des dernières 48 h (pas le dernier seul).
6. **Réputation** — signalements trop écartés du consensus pèsent moins ; comptes nouveaux plafonnés.
7. **Modération** — flag auto si écart extrême ; file d’attente simple.

## Stack proposée

- API légère (Hono ou Express) + Postgres
- Tables : `users`, `stations` (cache id gouv), `official_prices`, `reports`, `votes`
- Job : sync Open Data toutes les X heures
- Le front React consomme uniquement cette API pour les contributions

## Endpoints envisagés

- `GET /stations/:id/prices` — officiel + constaté
- `POST /stations/:id/reports` — `{ fuelType, price, agreed, lat?, lon? }` (auth)
- `POST /stations/:id/confirm` — « Prix OK » sans nouveau prix

## UI déjà en place (Phase 1)

Dans `StationDetails`, section « Prix constatés » avec boutons désactivés et texte « Bientôt ». Brancher ces boutons quand l’API existera.
