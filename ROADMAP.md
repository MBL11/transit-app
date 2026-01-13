# Transit App - Roadmap & Features

## 📊 Tableau Récapitulatif des Fonctionnalités

| # | Fonctionnalité | Description | Priorité | Statut | Prompt Claude Code |
|---|----------------|-------------|----------|--------|--------------------|
| 1 | **Setup Expo + NativeWind** | Créer le projet Expo avec TypeScript, configurer NativeWind/Tailwind, structure des dossiers | P0 | 🔲 À faire | Crée un nouveau projet Expo avec TypeScript. Configure NativeWind pour utiliser Tailwind CSS. Ajoute la configuration babel et tailwind.config.js avec une palette de couleurs pour une app de transport. Structure les dossiers : src/ avec core/, adapters/, components/ (ui/, transit/, map/), et locales/. |
| 2 | **Composants UI de base** | Copier React Native Reusables (Button, Card, Input, Sheet, etc.), créer LineCard, StopCard, SearchBar | P0 | 🔲 À faire | Copie les composants React Native Reusables nécessaires : Button, Card, Input, Sheet, Tabs, Badge, Skeleton, Alert, Separator. Place-les dans src/components/ui/. Crée les composants métier : LineCard (ligne avec numéro, nom, couleur), StopCard (arrêt avec lignes), et SearchBar dans src/components/transit/. |
| 3 | **Parser GTFS statique** | Parser CSV GTFS (stops, routes, trips, stop_times, shapes) avec papaparse | P0 | 🔲 À faire | Crée un parser GTFS dans src/core/gtfs-parser.ts qui lit les fichiers stops.txt, routes.txt, trips.txt, stop_times.txt, shapes.txt. Utilise papaparse pour parser les CSV. Retourne des objets TypeScript typés. Gère l'encodage UTF-8 et les erreurs. |
| 4 | **Base SQLite locale** | Configuration expo-sqlite, tables GTFS, requêtes optimisées | P0 | 🔲 À faire | Configure expo-sqlite pour stocker les données GTFS. Crée src/core/database.ts avec les tables : stops, routes, trips, stop_times, shapes. Ajoute des méthodes pour insérer et requêter (getStopById, getRoutesByStop, getAllStops). Optimise avec des index. |
| 5 | **Adapter Paris (interface)** | Définir TransitAdapter interface, implémenter ParisAdapter avec GTFS IDFM | P0 | 🔲 À faire | Définis l'interface TransitAdapter dans src/core/adapter-interface.ts avec loadStops(), loadRoutes(), getNextDepartures(), getAlerts(), et config. Implémente ParisAdapter dans src/adapters/paris/paris-adapter.ts qui charge les données GTFS d'IDFM. |
| 6 | **Affichage carte avec arrêts** | Carte interactive (Mapbox/react-native-maps) avec markers d'arrêts | P1 | 🔲 À faire | Crée TransitMap dans src/components/map/TransitMap.tsx qui utilise react-native-maps ou mapbox. Affiche tous les arrêts sous forme de markers. Au clic sur un marker, affiche le nom de l'arrêt. Centre la carte sur Paris au démarrage. |
| 7 | **Liste des lignes** | FlatList de toutes les lignes avec filtre par type de transport | P1 | 🔲 À faire | Crée LinesScreen qui affiche toutes les lignes avec FlatList et LineCard. Ajoute un filtre par type (métro, bus, tram, RER). Affiche la couleur officielle de chaque ligne. Au clic, affiche les arrêts de la ligne. |
| 8 | **Détails d'un arrêt** | Écran avec infos arrêt : nom, lignes, prochains passages théoriques | P1 | 🔲 À faire | Crée StopDetailsScreen qui affiche les détails d'un arrêt : nom, lignes qui s'y arrêtent, prochains passages (horaires théoriques depuis stop_times.txt). Trie par heure de départ. Utilise Card pour chaque ligne. |
| 9 | **Recherche d'arrêts** | Recherche full-text avec debounce, gestion des accents | P1 | 🔲 À faire | Implémente une recherche full-text sur les noms d'arrêts. Crée SearchScreen avec SearchBar. Filtre les arrêts en temps réel avec debounce (300ms). Affiche les résultats avec StopCard. Gère les accents (normalize UTF-8). |
| 10 | **Temps réel SIRI-Lite** | Intégration API IDFM, parsing XML SIRI, affichage temps réel | P2 | 🔲 À faire | Intègre l'API SIRI-Lite IDFM. Crée src/adapters/paris/siri-client.ts qui récupère les prochains passages pour un arrêt. Parse la réponse XML SIRI et normalise vers NextDeparture. Met à jour StopDetailsScreen pour afficher le temps réel. |
| 11 | **Bottom sheet de détails** | Remplacer navigation par bottom sheet glissable pour détails arrêt | P2 | 🔲 À faire | Remplace la navigation vers StopDetailsScreen par un bottom sheet (Sheet de React Native Reusables). Au clic sur un marker ou arrêt, ouvre le bottom sheet. Rend le sheet glissable et closable. Garde la carte visible en arrière-plan. |
| 12 | **Calcul d'itinéraire basique** | Algorithme Dijkstra sur GTFS pour trouver le chemin A→B | P2 | 🔲 À faire | Implémente un calcul d'itinéraire simple avec les données GTFS. Crée src/core/routing.ts avec algorithme de Dijkstra sur le graphe des stop_times. Crée RouteScreen avec inputs départ/arrivée et affiche les résultats avec temps, correspondances, horaires. |
| 13 | **Alertes et perturbations** | Récupération et affichage des perturbations IDFM | P2 | 🔲 À faire | Ajoute la gestion des alertes IDFM (SIRI-Lite). Crée src/adapters/paris/alerts.ts qui récupère les perturbations. Affiche un bandeau AlertBanner en haut de l'écran si une ligne/arrêt est perturbé. Alertes cliquables pour voir les détails. |
| 14 | **Favoris (local storage)** | Sauvegarder arrêts/lignes en favoris avec AsyncStorage | P3 | 🔲 À faire | Implémente un système de favoris avec AsyncStorage. Permet de sauvegarder arrêts et lignes. Crée FavoritesScreen avec accès rapide. Ajoute un bouton étoile dans StopDetailsScreen et LineCard pour ajouter/retirer des favoris. |
| 15 | **Internationalisation (i18n)** | Support multi-langues avec react-i18next (fr, en, tr, ro) | P3 | 🔲 À faire | Configure react-i18next pour plusieurs langues. Crée les fichiers src/locales/fr.json, en.json, tr.json. Traduis toute l'UI (pas les noms d'arrêts). Ajoute un sélecteur de langue dans les paramètres. Détecte la langue du téléphone au premier lancement. |
| 16 | **Dark mode** | Implémentation du thème sombre avec NativeWind | P3 | 🔲 À faire | Implémente le dark mode en utilisant les classes Tailwind de NativeWind (dark:). Crée un toggle dans les paramètres. Persiste le choix avec AsyncStorage. Assure-toi que tous les composants supportent le dark mode. |
| 17 | **Mode hors ligne** | Fonctionnement sans réseau, cache temps réel, indicateur de statut | P3 | 🔲 À faire | Optimise l'app pour fonctionner hors ligne. Les données GTFS doivent être accessibles sans connexion (SQLite). Ajoute un indicateur de statut réseau. Mets en cache les dernières données temps réel (5 minutes). Affiche un badge "Hors ligne" si pas de réseau. |
| 18 | **Adapter ville #2** | Créer un nouvel adapter (Bucarest) pour valider la portabilité | P4 | 🔲 À faire | Crée un nouvel adapter pour Bucarest. Télécharge le GTFS de Bucarest, crée src/adapters/bucharest/bucharest-adapter.ts qui implémente TransitAdapter. Vérifie que l'app fonctionne sans modifier le core. Documente les différences entre Paris et Bucarest. |

## 🎯 Phases de Développement

### Phase 0 : Foundation (P0)
Fonctionnalités **1-5** : Setup projet, composants UI, parsing GTFS, base de données, adapter Paris

**Objectif** : Avoir une base solide avec les données statiques de Paris chargées

**Durée estimée** : 2-3 jours

---

### Phase 1 : Core Features (P1)
Fonctionnalités **6-9** : Carte, liste des lignes, détails arrêt, recherche

**Objectif** : MVP fonctionnel avec données statiques uniquement

**Durée estimée** : 3-4 jours

---

### Phase 2 : Real-Time & Routing (P2)
Fonctionnalités **10-13** : Temps réel SIRI, bottom sheet, itinéraire, alertes

**Objectif** : App complète avec temps réel et calcul d'itinéraire

**Durée estimée** : 4-5 jours

---

### Phase 3 : Polish & Features (P3)
Fonctionnalités **14-17** : Favoris, i18n, dark mode, offline

**Objectif** : App polie prête pour les utilisateurs

**Durée estimée** : 3-4 jours

---

### Phase 4 : Portability Validation (P4)
Fonctionnalité **18** : Adapter pour une 2ème ville

**Objectif** : Valider que l'architecture est portable

**Durée estimée** : 2-3 jours

---

## 📈 Métriques de Succès

| Métrique | Cible | Phase |
|----------|-------|-------|
| **Temps de chargement initial** | < 2s | Phase 0 |
| **Réponse temps réel** | < 500ms | Phase 2 |
| **Fluidité carte** | 60 fps | Phase 1 |
| **Taille base SQLite** | < 100 MB | Phase 0 |
| **Support offline** | 100% GTFS statique | Phase 3 |
| **Temps pour nouvelle ville** | < 2 jours | Phase 4 |

## 🔄 Workflow de Développement

1. **Lire le prompt** dans CLAUDE.md pour la fonctionnalité
2. **Copier le prompt** dans Claude Code
3. **Implémenter** la fonctionnalité
4. **Tester manuellement** sur iOS/Android
5. **Commit** : `git commit -m "feat: description"`
6. **Passer à la suivante**

## 📝 Conventions de Commit

```
feat: ajoute recherche d'arrêts
fix: corrige crash au clic sur marker
docs: met à jour le guide des adapters
style: formate le code
refactor: restructure le parser GTFS
test: ajoute tests pour ParisAdapter
chore: met à jour les dépendances
```

## 🚀 Démarrage Rapide

```bash
# 1. Cloner le repo
git clone https://github.com/[username]/transit-app.git
cd transit-app

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Ajouter la clé API IDFM dans .env

# 4. Lancer l'app
npx expo start

# 5. Commencer par la fonctionnalité #1
# Voir CLAUDE.md pour le prompt
```

## 🎓 Ressources

- **Documentation projet** : [README.md](./README.md)
- **Plan détaillé** : [CLAUDE.md](./CLAUDE.md)
- **Architecture** : [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Guide adapters** : [docs/ADAPTERS.md](./docs/ADAPTERS.md)
- **Contribution** : [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Version** : 0.1.0  
**Dernière mise à jour** : Janvier 2025  
**Statut** : 🏗️ En construction
