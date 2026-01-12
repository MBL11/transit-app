# Transit App

Une application mobile de transport en commun (type Citymapper) conçue pour être facilement déployable sur différentes villes, même celles avec un réseau moins développé que Paris.

## 🎯 Vision

Créer une app de transit avec une UX supérieure, destinée aux marchés mal desservis (Turquie, Europe de l'Est, Afrique) où les apps existantes sont médiocres ou inexistantes.

## 🏗️ Architecture

### Principe clé : Adapter Pattern

Chaque ville a son propre "adapter" qui normalise les données vers un format interne commun :
- ✅ Développer sur Paris avec des données de qualité
- ✅ Swapper vers une autre ville sans réécrire la logique métier
- ✅ Gérer les différences de format (GTFS-RT vs SIRI-Lite vs API propriétaire)

### Structure du projet

```
transit-app/
├── src/
│   ├── core/           # Logique métier agnostique
│   ├── adapters/       # Un dossier par ville
│   │   ├── paris/
│   │   └── [future]/
│   ├── components/     # Composants React Native
│   │   ├── ui/         # React Native Reusables
│   │   ├── transit/    # Composants métier
│   │   └── map/        # Composants carte
│   └── locales/        # Traductions i18n
├── data/               # Données GTFS (gitignored)
└── docs/               # Documentation détaillée
```

## 🛠️ Stack Technique

- **Frontend**: React Native + Expo
- **UI Framework**: React Native Reusables + NativeWind (Tailwind CSS)
- **Base locale**: SQLite (stockage GTFS offline)
- **Carte**: Mapbox ou MapLibre
- **Backend** (si nécessaire): Express.js ou Go
- **Routing** (optionnel): OpenTripPlanner

## 📱 Fonctionnalités

### MVP (Phase 1)
- ✅ Affichage de la carte avec arrêts et lignes
- ✅ Recherche d'arrêts et de lignes
- ✅ Détails d'un arrêt (prochains passages)
- ✅ Temps réel des passages

### Phase 2
- 🔲 Calcul d'itinéraire (A → B)
- 🔲 Alertes et perturbations
- 🔲 Favoris (arrêts, lignes, trajets)
- 🔲 Mode hors ligne

### Phase 3
- 🔲 Validation sur une deuxième ville
- 🔲 Internationalisation complète
- 🔲 Notifications push

## 🌍 Villes Cibles

| Ville | Population | GTFS | Temps réel | Priorité |
|-------|------------|------|------------|----------|
| **Paris** (MVP) | 12M | ✅ | ✅ SIRI-Lite | 🟢 En cours |
| Ankara | 5.7M | Partiel | ✅ | ⭐⭐⭐⭐⭐ |
| Izmir | 4.4M | Partiel | ✅ | ⭐⭐⭐⭐⭐ |
| Bucarest | 2.1M | ✅ | ✅ GTFS-RT | ⭐⭐⭐⭐ |
| Nairobi | 4.5M | ✅ | ❌ | ⭐⭐⭐ |

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- Expo CLI
- Compte PRIM IDFM (pour les données Paris)

### Installation

```bash
# Cloner le repo
git clone https://github.com/[username]/transit-app.git
cd transit-app

# Installer les dépendances
npm install

# Lancer l'app
npx expo start
```

### Configuration

1. Créer un compte sur [PRIM IDFM](https://prim.iledefrance-mobilites.fr)
2. Copier `.env.example` vers `.env`
3. Ajouter votre clé API IDFM

## 📚 Documentation

Voir le dossier [`docs/`](./docs/) pour :
- Architecture détaillée
- Guide des adapters
- Spécifications GTFS
- Guide de contribution

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 Licence

MIT

## 🙏 Remerciements

- [Île-de-France Mobilités](https://prim.iledefrance-mobilites.fr) pour les données GTFS
- [React Native Reusables](https://reactnativereusables.com) pour les composants UI
- [Mobility Database](https://mobilitydatabase.org) pour les feeds GTFS mondiaux
