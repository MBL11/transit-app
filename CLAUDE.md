# Plan de Développement - Transit App

Ce document contient les prompts à utiliser avec Claude Code pour implémenter chaque fonctionnalité de manière incrémentale.

## 🎯 Philosophie

- **Une fonctionnalité à la fois** : Ne pas essayer de tout faire d'un coup
- **Tester avant d'avancer** : Valider chaque étape avant la suivante
- **Portable dès le départ** : Penser "adapter pattern" à chaque feature

---

## 📋 Tableau des Fonctionnalités

| #  | Fonctionnalité | Statut | Priorité |
|----|----------------|--------|----------|
| 1  | Setup projet Expo + NativeWind | 🔲 | P0 |
| 2  | Composants UI de base | 🔲 | P0 |
| 3  | Parser GTFS statique | 🔲 | P0 |
| 4  | Base SQLite locale | 🔲 | P0 |
| 5  | Adapter Paris (interface) | 🔲 | P0 |
| 6  | Affichage carte avec arrêts | 🔲 | P1 |
| 7  | Liste des lignes | 🔲 | P1 |
| 8  | Détails d'un arrêt | 🔲 | P1 |
| 9  | Recherche d'arrêts | 🔲 | P1 |
| 10 | Temps réel SIRI-Lite | 🔲 | P2 |
| 11 | Bottom sheet de détails | 🔲 | P2 |
| 12 | Calcul d'itinéraire basique | 🔲 | P2 |
| 13 | Alertes et perturbations | 🔲 | P2 |
| 14 | Favoris (local storage) | 🔲 | P3 |
| 15 | Internationalisation (i18n) | 🔲 | P3 |
| 16 | Dark mode | 🔲 | P3 |
| 17 | Mode hors ligne | 🔲 | P3 |
| 18 | Adapter ville #2 (validation) | 🔲 | P4 |

---

## 🚀 Prompts pour Claude Code

### 1. Setup Projet Expo + NativeWind

```
Crée un nouveau projet Expo avec TypeScript. Configure NativeWind pour utiliser Tailwind CSS. 
Ajoute la configuration babel et tailwind.config.js avec une palette de couleurs pour une app 
de transport (bleu pour métro, vert pour bus, rouge pour tram, etc.). Structure les dossiers : 
src/ avec core/, adapters/, components/ (ui/, transit/, map/), et locales/.
```

**Fichiers attendus** :
- `package.json` avec Expo + NativeWind
- `tailwind.config.js` avec palette transit
- `babel.config.js` configuré
- Structure de dossiers

---

### 2. Composants UI de Base

```
Copie les composants React Native Reusables nécessaires : Button, Card, Input, Sheet, Tabs, 
Badge, Skeleton, Alert, Separator. Place-les dans src/components/ui/. Crée ensuite les 
composants métier dans src/components/transit/ : LineCard (affiche une ligne avec son numéro, 
nom, couleur, et prochaine direction), StopCard (affiche un arrêt avec son nom et les lignes 
qui s'y arrêtent), et SearchBar (barre de recherche stylée).
```

**Fichiers attendus** :
- `src/components/ui/*` (Button, Card, Input, etc.)
- `src/components/transit/LineCard.tsx`
- `src/components/transit/StopCard.tsx`
- `src/components/transit/SearchBar.tsx`

---

### 3. Parser GTFS Statique

```
Crée un parser GTFS dans src/core/gtfs-parser.ts qui lit les fichiers stops.txt, routes.txt, 
trips.txt, stop_times.txt, shapes.txt (optionnel). Utilise papaparse pour parser les CSV. 
Le parser doit retourner des objets TypeScript typés : Stop, Route, Trip, StopTime. Gère 
l'encodage UTF-8 et les erreurs de parsing.
```

**Fichiers attendus** :
- `src/core/gtfs-parser.ts`
- `src/core/types/gtfs.ts` (interfaces TypeScript)

---

### 4. Base SQLite Locale

```
Configure expo-sqlite pour stocker les données GTFS localement. Crée un module 
src/core/database.ts qui initialise la base avec les tables : stops, routes, trips, 
stop_times, shapes. Ajoute des méthodes pour insérer les données parsées du GTFS et 
des requêtes de base (getStopById, getRoutesByStop, getAllStops). Optimise avec des index.
```

**Fichiers attendus** :
- `src/core/database.ts`
- Schema SQL pour les tables

---

### 5. Adapter Paris (Interface)

```
Définis l'interface TransitAdapter dans src/core/adapter-interface.ts avec les méthodes : 
loadStops(), loadRoutes(), loadTrips(), getNextDepartures(stopId), getVehiclePositions(), 
getAlerts(), et un objet config (timezone, bbox, defaultZoom). Implémente ParisAdapter dans 
src/adapters/paris/paris-adapter.ts qui charge les données GTFS d'IDFM et les normalise. 
Pour l'instant, seules les méthodes GTFS statiques sont nécessaires (pas de temps réel).
```

**Fichiers attendus** :
- `src/core/adapter-interface.ts`
- `src/adapters/paris/paris-adapter.ts`
- `src/adapters/paris/config.ts`

---

### 6. Affichage Carte avec Arrêts

```
Crée un composant TransitMap dans src/components/map/TransitMap.tsx qui utilise react-native-maps 
ou mapbox. Affiche tous les arrêts sous forme de markers. Au clic sur un marker, affiche le nom 
de l'arrêt. Centre la carte sur Paris (48.8566, 2.3522) au démarrage. Utilise les données de 
l'adapter Paris pour charger les stops.
```

**Fichiers attendus** :
- `src/components/map/TransitMap.tsx`
- `src/components/map/StopMarker.tsx`

---

### 7. Liste des Lignes

```
Crée un écran LinesScreen qui affiche toutes les lignes de transport disponibles. Utilise une 
FlatList avec le composant LineCard. Ajoute un filtre par type de transport (métro, bus, tram, 
RER). Chaque ligne doit afficher sa couleur officielle (stockée dans routes.txt). Au clic sur 
une ligne, affiche ses arrêts.
```

**Fichiers attendus** :
- `src/screens/LinesScreen.tsx`
- Logique de filtrage

---

### 8. Détails d'un Arrêt

```
Crée un écran StopDetailsScreen qui affiche tous les détails d'un arrêt : nom, lignes qui 
s'y arrêtent, prochains passages (statique pour l'instant, depuis stop_times.txt). Affiche 
les horaires théoriques triés par heure de départ. Utilise le composant Card pour chaque ligne.
```

**Fichiers attendus** :
- `src/screens/StopDetailsScreen.tsx`
- Logique de calcul des prochains passages théoriques

---

### 9. Recherche d'Arrêts

```
Implémente une recherche full-text sur les noms d'arrêts. Crée un SearchScreen avec le composant 
SearchBar. Au fur et à mesure de la frappe, filtre les arrêts et affiche les résultats avec 
StopCard. Optimise la recherche avec un debounce de 300ms. Gère les accents (normalize UTF-8).
```

**Fichiers attendus** :
- `src/screens/SearchScreen.tsx`
- Logique de recherche avec debounce

---

### 10. Temps Réel SIRI-Lite

```
Intègre l'API temps réel IDFM (SIRI-Lite). Crée un module src/adapters/paris/siri-client.ts 
qui récupère les prochains passages pour un arrêt donné. Parse la réponse XML SIRI et normalise 
les données vers un format interne (NextDeparture avec line, direction, departureTime, realtime). 
Met à jour l'écran StopDetailsScreen pour afficher le temps réel si disponible.
```

**Fichiers attendus** :
- `src/adapters/paris/siri-client.ts`
- Types pour les départs temps réel
- Mise à jour de StopDetailsScreen

---

### 11. Bottom Sheet de Détails

```
Remplace la navigation vers StopDetailsScreen par un bottom sheet (Sheet de React Native Reusables). 
Quand on clique sur un marker ou un arrêt dans la liste, ouvre le bottom sheet avec les détails. 
Rend le sheet glissable et closable. Garde la carte visible en arrière-plan.
```

**Fichiers attendus** :
- Intégration du Sheet dans TransitMap
- Refactor de StopDetailsScreen en composant

---

### 12. Calcul d'Itinéraire Basique

```
Implémente un calcul d'itinéraire simple en utilisant les données GTFS. Crée un module 
src/core/routing.ts qui trouve le chemin le plus court entre deux arrêts (algorithme de Dijkstra 
sur le graphe des stop_times). Crée un écran RouteScreen avec deux inputs (départ/arrivée) et 
affiche les résultats avec temps de trajet, correspondances, et horaires.
```

**Fichiers attendus** :
- `src/core/routing.ts`
- `src/screens/RouteScreen.tsx`
- `src/components/transit/RouteResult.tsx`

---

### 13. Alertes et Perturbations

```
Ajoute la gestion des alertes IDFM (via SIRI-Lite). Crée un module src/adapters/paris/alerts.ts 
qui récupère les perturbations en cours. Affiche un bandeau d'alerte (composant AlertBanner) 
en haut de l'écran si une ligne ou un arrêt est perturbé. Les alertes doivent être cliquables 
pour voir les détails.
```

**Fichiers attendus** :
- `src/adapters/paris/alerts.ts`
- `src/components/transit/AlertBanner.tsx`
- Intégration dans les écrans concernés

---

### 14. Favoris (Local Storage)

```
Implémente un système de favoris avec AsyncStorage. Permet de sauvegarder des arrêts et des 
lignes en favoris. Crée un écran FavoritesScreen qui affiche les favoris avec accès rapide. 
Ajoute un bouton étoile dans StopDetailsScreen et LineCard pour ajouter/retirer des favoris.
```

**Fichiers attendus** :
- `src/core/favorites.ts`
- `src/screens/FavoritesScreen.tsx`
- Boutons favoris dans les composants

---

### 15. Internationalisation (i18n)

```
Configure react-i18next pour supporter plusieurs langues. Crée les fichiers de traduction 
src/locales/fr.json, en.json, tr.json. Traduis toute l'UI (pas les noms d'arrêts). Ajoute 
un sélecteur de langue dans les paramètres. Détecte automatiquement la langue du téléphone 
au premier lancement.
```

**Fichiers attendus** :
- `src/locales/*.json`
- Configuration i18next
- Écran de paramètres

---

### 16. Dark Mode

```
Implémente le dark mode en utilisant les classes Tailwind de NativeWind (dark:). Crée un toggle 
dans les paramètres. Persiste le choix avec AsyncStorage. Assure-toi que tous les composants 
supportent le dark mode (texte, fond, cartes).
```

**Fichiers attendus** :
- Toggle dark mode
- Mise à jour des composants

---

### 17. Mode Hors Ligne

```
Optimise l'app pour fonctionner hors ligne. Les données GTFS statiques doivent être accessibles 
sans connexion (déjà dans SQLite). Ajoute un indicateur de statut réseau. Mets en cache les 
dernières données temps réel pendant 5 minutes. Affiche un badge "Hors ligne" si pas de réseau.
```

**Fichiers attendus** :
- Détection de connexion
- Cache temps réel
- Indicateur UI

---

### 18. Adapter Ville #2 (Validation)

```
Crée un nouvel adapter pour Bucarest (ou une autre ville GTFS disponible). Télécharge le GTFS 
de Bucarest, crée src/adapters/bucharest/bucharest-adapter.ts qui implémente TransitAdapter. 
Vérifie que l'app fonctionne sans modifier le core. Documente les différences de données entre 
Paris et Bucarest.
```

**Fichiers attendus** :
- `src/adapters/bucharest/`
- Documentation des différences

---

## 📝 Notes d'Implémentation

### Ordre Recommandé

1. **Phase 0** : Fonctionnalités 1-5 (Setup + données statiques)
2. **Phase 1** : Fonctionnalités 6-9 (UI de base + recherche)
3. **Phase 2** : Fonctionnalités 10-13 (Temps réel + itinéraire)
4. **Phase 3** : Fonctionnalités 14-17 (Polish + offline)
5. **Phase 4** : Fonctionnalité 18 (Validation portabilité)

### Points d'Attention

- **Ne pas coder en avance** : Implémenter chaque feature dans l'ordre
- **Tester manuellement** : Vérifier que l'app fonctionne après chaque étape
- **Garder le code simple** : Pas d'over-engineering pour Paris
- **Penser adapter** : Chaque feature doit fonctionner avec n'importe quelle ville

### Commandes Utiles

```bash
# Lancer l'app
npx expo start

# Tester sur iOS
npx expo start --ios

# Tester sur Android
npx expo start --android

# Build de production
npx expo build:android
npx expo build:ios
```

---

## 🎓 Ressources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Reusables](https://reactnativereusables.com)
- [NativeWind](https://www.nativewind.dev)
- [GTFS Spec](https://gtfs.org)
- [IDFM Open Data](https://prim.iledefrance-mobilites.fr)
