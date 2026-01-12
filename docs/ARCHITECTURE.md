# Architecture Transit App

## 🏛️ Vue d'ensemble

L'application est conçue autour du **Adapter Pattern** pour permettre une portabilité maximale entre différentes villes.

```
┌─────────────────────────────────────────────────────────┐
│                     React Native UI                      │
│  (Composants agnostiques de la ville - transit/*, map/*) │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Core Business Logic                    │
│     (Routing, Search, Favorites, Cache Management)       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Transit Adapter Interface               │
│    (Contract commun que chaque ville doit implémenter)   │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬──────────────┐
         ▼             ▼             ▼              ▼
    ┌────────┐   ┌─────────┐   ┌────────┐   ┌──────────┐
    │ Paris  │   │ Ankara  │   │Bucarest│   │  Future  │
    │Adapter │   │ Adapter │   │Adapter │   │  Cities  │
    └────────┘   └─────────┘   └────────┘   └──────────┘
         │             │             │              │
         ▼             ▼             ▼              ▼
    ┌────────┐   ┌─────────┐   ┌────────┐   ┌──────────┐
    │ GTFS + │   │  GTFS   │   │ GTFS + │   │   ???    │
    │  SIRI  │   │   API   │   │GTFS-RT │   │          │
    └────────┘   └─────────┘   └────────┘   └──────────┘
```

## 🔌 Interface TransitAdapter

Chaque ville doit implémenter cette interface :

```typescript
interface TransitAdapter {
  // Configuration
  readonly config: {
    cityName: string;
    defaultLocale: string;
    supportedLocales: string[];
    timezone: string;
    boundingBox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
    defaultZoom: number;
    defaultCenter: [number, number]; // [lat, lon]
  };

  // Données statiques (GTFS)
  loadStops(): Promise<Stop[]>;
  loadRoutes(): Promise<Route[]>;
  loadTrips(): Promise<Trip[]>;
  loadStopTimes(): Promise<StopTime[]>;
  loadShapes?(): Promise<Shape[]>; // Optionnel

  // Données temps réel
  getNextDepartures(stopId: string): Promise<NextDeparture[]>;
  getVehiclePositions?(): Promise<VehiclePosition[]>; // Optionnel
  getAlerts(): Promise<Alert[]>;

  // Métadonnées
  getDataSource(): DataSource;
  getLastUpdate(): Date;
}
```

## 📁 Structure des Dossiers

```
transit-app/
├── src/
│   ├── core/                           # Logique métier agnostique
│   │   ├── types/                      # Types TypeScript partagés
│   │   │   ├── gtfs.ts                 # Types GTFS standard
│   │   │   ├── realtime.ts             # Types temps réel normalisés
│   │   │   └── adapter.ts              # Interface TransitAdapter
│   │   ├── gtfs-parser.ts              # Parser GTFS générique
│   │   ├── database.ts                 # SQLite wrapper
│   │   ├── routing.ts                  # Calcul d'itinéraire
│   │   ├── search.ts                   # Recherche d'arrêts/lignes
│   │   ├── favorites.ts                # Gestion des favoris
│   │   └── cache.ts                    # Cache temps réel
│   │
│   ├── adapters/                       # Adapters par ville
│   │   ├── paris/
│   │   │   ├── paris-adapter.ts        # Implémentation ParisAdapter
│   │   │   ├── siri-client.ts          # Client SIRI-Lite
│   │   │   ├── alerts.ts               # Alertes IDFM
│   │   │   ├── config.ts               # Config Paris
│   │   │   └── utils.ts                # Helpers spécifiques Paris
│   │   │
│   │   ├── bucharest/                  # Futur adapter
│   │   │   └── ...
│   │   │
│   │   └── adapter-factory.ts          # Factory pour choisir l'adapter
│   │
│   ├── components/
│   │   ├── ui/                         # React Native Reusables
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── separator.tsx
│   │   │   └── ...
│   │   │
│   │   ├── transit/                    # Composants métier
│   │   │   ├── LineCard.tsx            # Carte d'une ligne
│   │   │   ├── StopCard.tsx            # Carte d'un arrêt
│   │   │   ├── DepartureRow.tsx        # Ligne de prochain passage
│   │   │   ├── AlertBanner.tsx         # Bandeau perturbation
│   │   │   ├── SearchBar.tsx           # Barre de recherche
│   │   │   └── RouteResult.tsx         # Résultat d'itinéraire
│   │   │
│   │   └── map/                        # Composants carte
│   │       ├── TransitMap.tsx          # Carte principale
│   │       ├── StopMarker.tsx          # Marker d'arrêt
│   │       └── RoutePolyline.tsx       # Tracé de ligne
│   │
│   ├── screens/                        # Écrans de l'app
│   │   ├── MapScreen.tsx               # Écran carte
│   │   ├── LinesScreen.tsx             # Liste des lignes
│   │   ├── SearchScreen.tsx            # Recherche
│   │   ├── StopDetailsScreen.tsx       # Détails d'un arrêt
│   │   ├── RouteScreen.tsx             # Calcul d'itinéraire
│   │   ├── FavoritesScreen.tsx         # Favoris
│   │   └── SettingsScreen.tsx          # Paramètres
│   │
│   ├── locales/                        # Traductions i18n
│   │   ├── fr.json                     # Français
│   │   ├── en.json                     # Anglais
│   │   ├── tr.json                     # Turc
│   │   └── ro.json                     # Roumain
│   │
│   ├── hooks/                          # React hooks custom
│   │   ├── useAdapter.ts               # Hook pour accéder à l'adapter
│   │   ├── useRealtime.ts              # Hook temps réel
│   │   ├── useFavorites.ts             # Hook favoris
│   │   └── useSearch.ts                # Hook recherche
│   │
│   └── utils/                          # Utilitaires génériques
│       ├── colors.ts                   # Gestion des couleurs
│       ├── distance.ts                 # Calculs géométriques
│       └── time.ts                     # Formatage d'horaires
│
├── data/                               # Données (gitignored)
│   └── gtfs/
│       ├── paris/
│       └── [autres-villes]/
│
├── docs/                               # Documentation
│   ├── ARCHITECTURE.md                 # Ce fichier
│   ├── ADAPTERS.md                     # Guide des adapters
│   ├── GTFS.md                         # Spécifications GTFS
│   └── CONTRIBUTING.md                 # Guide de contribution
│
├── .gitignore
├── README.md
├── CLAUDE.md                           # Plan de développement
├── package.json
├── tailwind.config.js
├── babel.config.js
├── tsconfig.json
└── app.json                            # Config Expo
```

## 🔄 Flux de Données

### 1. Chargement Initial (Cold Start)

```
1. App démarre
2. AdapterFactory choisit l'adapter (basé sur config ou sélection user)
3. Adapter charge les données GTFS depuis SQLite
   - Si première fois : télécharge GTFS, parse, stocke dans SQLite
   - Sinon : lit depuis SQLite
4. UI affiche la carte avec les données statiques
```

### 2. Affichage Temps Réel

```
1. User clique sur un arrêt
2. UI appelle adapter.getNextDepartures(stopId)
3. Adapter fait l'appel API (SIRI-Lite, GTFS-RT, etc.)
4. Adapter normalise la réponse vers NextDeparture[]
5. UI affiche les prochains passages
6. Cache la réponse pendant 30 secondes
```

### 3. Calcul d'Itinéraire

```
1. User entre origine et destination
2. Core/routing.ts utilise les données GTFS de l'adapter
3. Algorithme de Dijkstra sur le graphe des stop_times
4. Résultat normalisé (liste de Trip + StopTime)
5. UI affiche l'itinéraire avec RouteResult components
```

## 🎨 Gestion des Couleurs

Chaque ligne de transport a une couleur officielle (dans GTFS : `route_color`). 

### Standardisation

```typescript
// Dans utils/colors.ts
export function normalizeRouteColor(color: string): string {
  // Convertit les formats variés en hex #RRGGBB
  // Gère les couleurs manquantes (fallback par type de transport)
}

export function getTextColorForBackground(bgColor: string): 'white' | 'black' {
  // Calcule le contraste pour la lisibilité
}
```

### Usage dans les composants

```tsx
<Badge style={{ backgroundColor: normalizeRouteColor(route.color) }}>
  <Text style={{ color: getTextColorForBackground(route.color) }}>
    {route.shortName}
  </Text>
</Badge>
```

## 🗄️ Base de Données SQLite

### Tables

```sql
CREATE TABLE stops (
  stop_id TEXT PRIMARY KEY,
  stop_name TEXT NOT NULL,
  stop_lat REAL NOT NULL,
  stop_lon REAL NOT NULL,
  location_type INTEGER,
  parent_station TEXT
);

CREATE TABLE routes (
  route_id TEXT PRIMARY KEY,
  route_short_name TEXT,
  route_long_name TEXT,
  route_type INTEGER NOT NULL,
  route_color TEXT,
  route_text_color TEXT
);

CREATE TABLE trips (
  trip_id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  trip_headsign TEXT,
  direction_id INTEGER,
  shape_id TEXT,
  FOREIGN KEY (route_id) REFERENCES routes(route_id)
);

CREATE TABLE stop_times (
  trip_id TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  stop_id TEXT NOT NULL,
  stop_sequence INTEGER NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
  FOREIGN KEY (stop_id) REFERENCES stops(stop_id),
  PRIMARY KEY (trip_id, stop_sequence)
);

CREATE TABLE shapes (
  shape_id TEXT NOT NULL,
  shape_pt_lat REAL NOT NULL,
  shape_pt_lon REAL NOT NULL,
  shape_pt_sequence INTEGER NOT NULL,
  PRIMARY KEY (shape_id, shape_pt_sequence)
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_stop_times_stop_id ON stop_times(stop_id);
CREATE INDEX idx_stop_times_trip_id ON stop_times(trip_id);
CREATE INDEX idx_trips_route_id ON trips(route_id);
CREATE INDEX idx_stops_location ON stops(stop_lat, stop_lon);
```

### Requêtes Fréquentes

```typescript
// Tous les arrêts dans une bounding box
SELECT * FROM stops 
WHERE stop_lat BETWEEN ? AND ? 
  AND stop_lon BETWEEN ? AND ?;

// Lignes desservant un arrêt
SELECT DISTINCT r.* 
FROM routes r
JOIN trips t ON r.route_id = t.route_id
JOIN stop_times st ON t.trip_id = st.trip_id
WHERE st.stop_id = ?;

// Prochains passages théoriques à un arrêt
SELECT t.trip_headsign, st.departure_time, r.route_short_name
FROM stop_times st
JOIN trips t ON st.trip_id = t.trip_id
JOIN routes r ON t.route_id = r.route_id
WHERE st.stop_id = ?
  AND st.departure_time >= ?
ORDER BY st.departure_time
LIMIT 10;
```

## 🌐 Internationalisation

### Structure des traductions

```json
// locales/fr.json
{
  "common": {
    "search": "Rechercher",
    "favorites": "Favoris",
    "settings": "Paramètres"
  },
  "transit": {
    "nextDeparture": "Prochain passage",
    "direction": "Direction",
    "delayed": "Retardé",
    "onTime": "À l'heure"
  },
  "time": {
    "inMinutes": "dans {{count}} min",
    "now": "Maintenant"
  }
}
```

### Usage

```tsx
import { useTranslation } from 'react-i18next';

function StopCard() {
  const { t } = useTranslation();
  
  return (
    <Text>{t('transit.nextDeparture')}: {t('time.inMinutes', { count: 5 })}</Text>
  );
}
```

## 🔒 Gestion des Erreurs

### Principes

1. **Graceful degradation** : Si le temps réel échoue, afficher les horaires théoriques
2. **Retry logic** : Réessayer les appels API avec backoff exponentiel
3. **User feedback** : Toujours informer l'utilisateur de l'état

### Implémentation

```typescript
async function getNextDepartures(stopId: string): Promise<NextDeparture[]> {
  try {
    // Essayer le temps réel
    return await adapter.getNextDepartures(stopId);
  } catch (error) {
    console.warn('Realtime failed, falling back to static', error);
    
    // Fallback sur horaires théoriques
    return getTheoreticalDepartures(stopId);
  }
}
```

## 📊 Performance

### Optimisations

1. **Lazy loading** : Charger les données par chunks (tiles de carte)
2. **Virtualisation** : FlatList pour les listes longues
3. **Memoization** : React.memo pour les composants coûteux
4. **Cache** : Mettre en cache les appels API pendant 30s-5min
5. **SQLite indexes** : Indexer toutes les colonnes de recherche

### Métriques à surveiller

- Temps de chargement initial (< 2s)
- Temps de réponse temps réel (< 500ms)
- Fluidité de la carte (60 fps)
- Taille de la base SQLite (< 100 MB pour Paris)

---

## 🚀 Prochaines Étapes

Voir [CLAUDE.md](../CLAUDE.md) pour le plan de développement détaillé.
