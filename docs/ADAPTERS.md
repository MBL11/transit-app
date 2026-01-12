# Guide des Adapters

Ce guide explique comment créer un nouvel adapter pour une ville.

## 🎯 Qu'est-ce qu'un Adapter ?

Un adapter est un module qui normalise les données d'une ville spécifique (GTFS, API temps réel, alertes) vers un format interne commun utilisé par l'app.

**Objectif** : Permettre d'ajouter une nouvelle ville sans toucher au code core de l'application.

## 📋 Checklist : Ajouter une Nouvelle Ville

- [ ] Vérifier que la ville a des données GTFS disponibles
- [ ] Télécharger et analyser le GTFS
- [ ] Identifier l'API temps réel (si disponible)
- [ ] Créer le dossier `src/adapters/[ville]/`
- [ ] Implémenter l'adapter
- [ ] Ajouter les tests
- [ ] Documenter les spécificités

## 🏗️ Structure d'un Adapter

```
src/adapters/paris/
├── paris-adapter.ts      # Classe principale (implémente TransitAdapter)
├── config.ts             # Configuration (bbox, timezone, etc.)
├── siri-client.ts        # Client API temps réel (si applicable)
├── alerts.ts             # Gestion des alertes (si applicable)
├── utils.ts              # Helpers spécifiques
└── README.md             # Documentation spécifique
```

## 📝 Template d'Adapter

```typescript
// src/adapters/[ville]/[ville]-adapter.ts
import type { TransitAdapter, Stop, Route, Trip, NextDeparture, Alert } from '~/core/types';
import { config } from './config';

export class [Ville]Adapter implements TransitAdapter {
  readonly config = config;

  async loadStops(): Promise<Stop[]> {
    // Charger les arrêts depuis GTFS ou API
    // Normaliser vers le format Stop[]
  }

  async loadRoutes(): Promise<Route[]> {
    // Charger les lignes depuis GTFS ou API
  }

  async loadTrips(): Promise<Trip[]> {
    // Charger les trajets depuis GTFS ou API
  }

  async getNextDepartures(stopId: string): Promise<NextDeparture[]> {
    // Appel API temps réel
    // Ou calcul depuis GTFS statique si pas de temps réel
    // Normaliser vers NextDeparture[]
  }

  async getAlerts(): Promise<Alert[]> {
    // Récupérer les perturbations
    // Ou retourner [] si pas disponible
  }

  getDataSource(): DataSource {
    return {
      name: '[Nom officiel]',
      url: 'https://...',
      license: 'Open Data License',
      attribution: '© [Autorité de transport]'
    };
  }

  getLastUpdate(): Date {
    // Date de dernière mise à jour des données GTFS
    return new Date('2024-01-15');
  }
}
```

## ⚙️ Configuration d'une Ville

```typescript
// src/adapters/[ville]/config.ts
import type { AdapterConfig } from '~/core/types';

export const config: AdapterConfig = {
  cityName: 'Paris',
  defaultLocale: 'fr',
  supportedLocales: ['fr', 'en'],
  timezone: 'Europe/Paris',
  boundingBox: [48.8156, 2.2241, 48.9022, 2.4699], // [minLat, minLon, maxLat, maxLon]
  defaultZoom: 12,
  defaultCenter: [48.8566, 2.3522], // [lat, lon]
  currency: 'EUR',
  distanceUnit: 'metric', // ou 'imperial'
};
```

## 🔄 Normalisation des Données

### GTFS → Format Interne

Le GTFS est déjà standardisé, donc la normalisation est minimale :

```typescript
// Exemple : Normaliser un stop GTFS
function normalizeStop(gtfsStop: GTFSStop): Stop {
  return {
    id: gtfsStop.stop_id,
    name: gtfsStop.stop_name,
    lat: parseFloat(gtfsStop.stop_lat),
    lon: parseFloat(gtfsStop.stop_lon),
    locationType: gtfsStop.location_type || 0,
    parentStation: gtfsStop.parent_station,
  };
}
```

### API Propriétaire → NextDeparture

Si la ville a une API temps réel propriétaire (non-GTFS), il faut la normaliser :

```typescript
// Exemple : Normaliser une réponse SIRI-Lite (Paris)
function normalizeSiriDeparture(siriCall: SIRICall): NextDeparture {
  return {
    tripId: siriCall.DatedVehicleJourneyRef,
    routeId: siriCall.LineRef,
    routeShortName: siriCall.PublishedLineName,
    headsign: siriCall.DestinationName,
    departureTime: new Date(siriCall.ExpectedDepartureTime),
    isRealtime: true,
    delay: siriCall.DepartureStatus === 'delayed' ? siriCall.Delay : 0,
  };
}
```

### Gestion des Alertes

Format interne des alertes :

```typescript
interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'severe';
  affectedRoutes?: string[];
  affectedStops?: string[];
  startTime: Date;
  endTime?: Date;
  url?: string;
}
```

## 🌍 Exemples d'Adapters

### Adapter Simple (GTFS uniquement)

Pour une ville qui n'a que du GTFS statique (pas de temps réel) :

```typescript
export class SimpleGTFSAdapter implements TransitAdapter {
  async getNextDepartures(stopId: string): Promise<NextDeparture[]> {
    // Pas de temps réel disponible
    // Retourner les horaires théoriques depuis stop_times
    const now = new Date();
    const currentTime = `${now.getHours()}:${now.getMinutes()}:00`;
    
    const departures = await db.query(`
      SELECT * FROM stop_times 
      WHERE stop_id = ? AND departure_time >= ?
      ORDER BY departure_time LIMIT 10
    `, [stopId, currentTime]);
    
    return departures.map(d => ({
      ...d,
      isRealtime: false, // Horaires théoriques
      delay: 0,
    }));
  }

  async getAlerts(): Promise<Alert[]> {
    // Pas d'alertes disponibles
    return [];
  }
}
```

### Adapter avec GTFS-RT

Pour une ville qui supporte GTFS-Realtime :

```typescript
import { FeedMessage } from 'gtfs-realtime-bindings';

export class GTFSRTAdapter implements TransitAdapter {
  private readonly GTFS_RT_URL = 'https://api.example.com/gtfs-rt/trip-updates';

  async getNextDepartures(stopId: string): Promise<NextDeparture[]> {
    // Télécharger le feed GTFS-RT
    const response = await fetch(this.GTFS_RT_URL);
    const buffer = await response.arrayBuffer();
    const feed = FeedMessage.decode(new Uint8Array(buffer));
    
    // Filtrer par stop_id
    const relevantUpdates = feed.entity
      .filter(e => e.tripUpdate?.stopTimeUpdate?.some(stu => stu.stopId === stopId));
    
    // Normaliser
    return relevantUpdates.map(update => ({
      tripId: update.tripUpdate.trip.tripId,
      departureTime: new Date(update.tripUpdate.timestamp * 1000),
      isRealtime: true,
      delay: update.tripUpdate.delay || 0,
      // ...
    }));
  }
}
```

### Adapter avec API Propriétaire

Pour une ville avec une API custom (exemple : SIRI-Lite de Paris) :

```typescript
export class ParisAdapter implements TransitAdapter {
  private readonly SIRI_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring';
  private readonly API_KEY = process.env.IDFM_API_KEY;

  async getNextDepartures(stopId: string): Promise<NextDeparture[]> {
    // Appel API SIRI-Lite
    const response = await fetch(
      `${this.SIRI_URL}?MonitoringRef=STIF:StopPoint:Q:${stopId}:`,
      { headers: { 'apikey': this.API_KEY } }
    );
    
    const xml = await response.text();
    const parsed = parseSIRI(xml); // Parser XML → JSON
    
    // Normaliser vers NextDeparture[]
    return parsed.MonitoredStopVisit.map(visit => ({
      tripId: visit.MonitoredVehicleJourney.FramedVehicleJourneyRef.DatedVehicleJourneyRef,
      routeShortName: visit.MonitoredVehicleJourney.PublishedLineName,
      headsign: visit.MonitoredVehicleJourney.DestinationName,
      departureTime: new Date(visit.MonitoredCall.ExpectedDepartureTime),
      isRealtime: true,
      delay: this.calculateDelay(visit),
    }));
  }

  private calculateDelay(visit: SIRIVisit): number {
    const expected = new Date(visit.MonitoredCall.ExpectedDepartureTime);
    const aimed = new Date(visit.MonitoredCall.AimedDepartureTime);
    return (expected.getTime() - aimed.getTime()) / 1000; // secondes
  }
}
```

## 🧪 Tests d'un Adapter

Chaque adapter doit avoir des tests :

```typescript
// src/adapters/[ville]/__tests__/[ville]-adapter.test.ts
import { [Ville]Adapter } from '../[ville]-adapter';

describe('[Ville]Adapter', () => {
  let adapter: [Ville]Adapter;

  beforeEach(() => {
    adapter = new [Ville]Adapter();
  });

  test('loadStops should return valid stops', async () => {
    const stops = await adapter.loadStops();
    expect(stops.length).toBeGreaterThan(0);
    expect(stops[0]).toHaveProperty('id');
    expect(stops[0]).toHaveProperty('name');
    expect(stops[0]).toHaveProperty('lat');
    expect(stops[0]).toHaveProperty('lon');
  });

  test('getNextDepartures should return departures for valid stop', async () => {
    const departures = await adapter.getNextDepartures('STOP_123');
    expect(Array.isArray(departures)).toBe(true);
    if (departures.length > 0) {
      expect(departures[0]).toHaveProperty('departureTime');
      expect(departures[0]).toHaveProperty('isRealtime');
    }
  });

  test('config should have required fields', () => {
    expect(adapter.config.cityName).toBeDefined();
    expect(adapter.config.timezone).toBeDefined();
    expect(adapter.config.boundingBox).toHaveLength(4);
  });
});
```

## 📊 Validation des Données

Avant de pousser un nouvel adapter, valider :

1. **GTFS** :
   - Tous les fichiers requis sont présents (`stops.txt`, `routes.txt`, etc.)
   - Pas d'erreurs de parsing
   - Les coordonnées sont valides
   - Les couleurs des lignes sont définies

2. **Temps réel** :
   - L'API répond bien
   - Les données sont à jour (< 2 minutes)
   - Le format est cohérent avec GTFS

3. **Performance** :
   - Chargement initial < 3 secondes
   - Appels API temps réel < 1 seconde
   - Base SQLite < 150 MB

## 🚨 Pièges Courants

### 1. Encodage des caractères

GTFS doit être en UTF-8, mais certains feeds sont en Latin-1 ou Windows-1252.

```typescript
// Détection et conversion
function parseGTFS(file: string): string {
  const buffer = fs.readFileSync(file);
  const encoding = detectEncoding(buffer); // jschardet
  return iconv.decode(buffer, encoding);
}
```

### 2. Timezones

Les horaires GTFS sont en heure locale de la ville. Toujours utiliser le timezone du config.

```typescript
import { zonedTimeToUtc } from 'date-fns-tz';

function parseGTFSTime(time: string, date: Date, timezone: string): Date {
  // "14:30:00" + date + timezone → Date UTC
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const local = new Date(date);
  local.setHours(hours, minutes, seconds);
  return zonedTimeToUtc(local, timezone);
}
```

### 3. Stop IDs différents

Les stop_id GTFS peuvent différer des IDs de l'API temps réel.

```typescript
// Créer un mapping si nécessaire
const STOP_ID_MAPPING = {
  'GTFS:123': 'API:456',
  // ...
};

function mapStopId(gtfsId: string): string {
  return STOP_ID_MAPPING[gtfsId] || gtfsId;
}
```

### 4. Données manquantes

Certains GTFS n'ont pas `shapes.txt` ou `route_color`.

```typescript
// Gérer les optionnels
async loadShapes(): Promise<Shape[]> {
  try {
    return await parseShapesTxt();
  } catch {
    console.warn('shapes.txt not available, using straight lines');
    return []; // L'app doit gérer ce cas
  }
}
```

## 📚 Ressources

- [GTFS Static Spec](https://gtfs.org/schedule/)
- [GTFS Realtime Spec](https://gtfs.org/realtime/)
- [SIRI Spec](http://www.siri.org.uk/)
- [Mobility Database](https://mobilitydatabase.org/) - Trouver les feeds GTFS mondiaux
- [Transitland](https://transit.land/) - Explorer les réseaux de transport

## ✅ Pull Request Checklist

Avant de soumettre un nouvel adapter :

- [ ] Tests passent
- [ ] Documentation du README de l'adapter
- [ ] Données GTFS validées (pas d'erreurs)
- [ ] Temps réel fonctionne (si applicable)
- [ ] Configuration complète (timezone, bbox, etc.)
- [ ] Exemple d'utilisation ajouté
- [ ] Performance acceptable (voir métriques)

---

**Question ?** Ouvre une issue sur GitHub ou consulte la [documentation principale](../README.md).
