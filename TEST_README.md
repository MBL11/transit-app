# Tests GTFS Parser

## Tests disponibles

### 1. Test JavaScript (Simple)
```bash
node test-parser.js
```

Test rapide qui vérifie :
- ✅ Parsing CSV avec PapaParse
- ✅ Normalisation des données
- ✅ Validation des coordonnées
- ✅ Structure des données

### 2. Test TypeScript (Complet)
```bash
npx tsx test-parser-ts.ts
```

Test complet avec la suite de tests TypeScript :
- ✅ Parsing individuel de chaque fichier GTFS
- ✅ Normalisation de chaque type de données
- ✅ Parsing de feed complet
- ✅ Validation complète des données

## Résultats des tests

### Données de test (sample Paris)

**Stops** (3 arrêts):
- Gare du Nord (48.8809, 2.3553)
- Châtelet (48.8584, 2.3470)
- République (48.8673, 2.3636)

**Routes** (3 lignes):
- Ligne 1 (Métro, jaune #FFCD00)
- Ligne 14 (Métro, violet #62259D)
- Bus 91 (bleu #82C8E6)

**Trips** (3 courses):
- TRIP001: Ligne 1 → La Défense
- TRIP002: Ligne 1 → Château de Vincennes
- TRIP003: Ligne 14 → Olympiades

**Stop Times** (5 passages):
- 08:00 - Gare du Nord (Ligne 1)
- 08:05 - Châtelet (Ligne 1)
- 08:10 - République (Ligne 1)
- 09:00 - République (Ligne 1 retour)
- 09:05 - Châtelet (Ligne 1 retour)

## Format des données

### Stop (Arrêt)
```json
{
  "id": "STOP001",
  "name": "Gare du Nord",
  "lat": 48.8809,
  "lon": 2.3553,
  "locationType": 0
}
```

### Route (Ligne)
```json
{
  "id": "ROUTE001",
  "shortName": "1",
  "longName": "Métro Ligne 1",
  "type": 1,
  "color": "#FFCD00",
  "textColor": "#000000"
}
```

### Trip (Course)
```json
{
  "id": "TRIP001",
  "routeId": "ROUTE001",
  "serviceId": "SERVICE1",
  "headsign": "La Défense",
  "directionId": 0,
  "shapeId": "SHAPE001"
}
```

### StopTime (Horaire)
```json
{
  "tripId": "TRIP001",
  "arrivalTime": "08:00:00",
  "departureTime": "08:00:00",
  "stopId": "STOP001",
  "stopSequence": 1
}
```

## Validation

Le parser vérifie automatiquement :

✅ **Présence des données requises**
- Stops > 0
- Routes > 0
- Trips > 0
- Stop Times > 0

✅ **Validité des coordonnées**
- Latitude entre -90 et 90
- Longitude entre -180 et 180
- Pas de NaN

✅ **Cohérence des couleurs**
- Format hexadécimal
- Valeurs par défaut si manquantes

✅ **Types de données**
- IDs en string
- Nombres parsés correctement
- Format horaire HH:MM:SS

## Utilisation dans l'app

```typescript
import { parseGTFSFeed, validateGTFSData } from './src/core/gtfs-parser';

// 1. Parser des fichiers CSV
const data = parseGTFSFeed({
  stops: stopsCSV,
  routes: routesCSV,
  trips: tripsCSV,
  stopTimes: stopTimesCSV,
});

// 2. Valider
const { isValid, errors } = validateGTFSData(data);

// 3. Importer en base
import { importGTFSToDatabase } from './src/core/gtfs-importer';
await importGTFSToDatabase(data);
```

## Prochaines étapes

- [ ] Télécharger les vraies données IDFM
- [ ] Parser le fichier ZIP GTFS complet
- [ ] Importer dans SQLite
- [ ] Tester avec l'adapter Paris
