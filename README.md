# ⛽ CarbuTarn

Application web cartographique permettant de consulter facilement les prix des carburants dans le Tarn.

CarbuTarn s'appuie sur les données publiques françaises pour afficher les stations-service, leurs carburants disponibles, leurs prix et différentes informations pratiques.

> 🚧 Projet en cours de développement.

## Fonctionnalités actuelles

- 🗺️ Carte interactive des stations-service du Tarn
- 📍 Géolocalisation de l'utilisateur
- ⛽ Affichage des prix officiels des carburants
- 🔄 Synchronisation entre la carte et la liste des stations visibles
- 🎯 Sélection d'une station depuis la carte ou la liste
- 🧾 Fiche détaillée d'une station
- 🕐 Date de mise à jour des prix
- 🛠️ Affichage des services disponibles
- 📱 Interface responsive desktop / mobile

## Fonctionnalités prévues

- 🔎 Recherche par ville
- 📏 Classement des stations par distance
- 💰 Classement par prix et type de carburant
- 🏪 Identification des enseignes
- ⭐ Ville favorite
- 👥 Contributions communautaires
- ✅ Confirmation des prix par les utilisateurs

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- MapLibre GL JS
- OpenStreetMap

## Données

Les données relatives aux stations-service et aux prix des carburants proviennent des données publiques françaises.

Les données cartographiques sont fournies par OpenStreetMap.

## Architecture

```text
Open Data carburants
        ↓
   fuelApi.ts
        ↓
 normalisation
        ↓
    Station[]
     ↙     ↘
MapLibre   React
 carte     liste / fiche
```

## Licence

Ce projet est distribué sous licence MIT.

## Auteur

Développé par Hexa Décodeur.
