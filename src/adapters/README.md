# Transit Adapters

This directory contains city-specific adapters that implement the `TransitAdapter` interface.

## Architecture

The adapter pattern allows the app to support multiple cities without changing the core code. Each city adapter is responsible for:

1. **Configuration** - City-specific settings (timezone, bounds, locale)
2. **Data Loading** - Loading GTFS static data into the database
3. **Real-time Data** - Fetching live departures and alerts (when available)
4. **Normalization** - Converting city-specific data to our internal format

## TransitAdapter Interface

Every adapter must implement:

```typescript
interface TransitAdapter {
  // Configuration
  readonly config: AdapterConfig;

  // Static GTFS data
  loadStops(): Promise<Stop[]>;
  loadRoutes(): Promise<Route[]>;
  loadTrips(): Promise<Trip[]>;
  loadStopTimes(): Promise<StopTime[]>;
  loadShapes?(): Promise<any[]>;

  // Real-time data
  getNextDepartures(stopId: string): Promise<NextDeparture[]>;
  getAlerts(): Promise<Alert[]>;

  // Metadata
  getDataSource(): DataSource;
  getLastUpdate(): Date;
}
```

## Available Adapters

### Paris (IDFM)

- **Location**: `src/adapters/paris/`
- **Data Source**: Île-de-France Mobilités Open Data
- **Coverage**: Paris region (Île-de-France)
- **Transport modes**: Metro, RER, Tram, Bus, Train
- **Real-time**: Static schedules for now (SIRI-Lite API planned for step 10)

**Usage**:
```typescript
import { parisAdapter } from './adapters/paris';

// Initialize
await parisAdapter.initialize();

// Load data
const stops = await parisAdapter.loadStops();
const routes = await parisAdapter.loadRoutes();

// Get next departures
const departures = await parisAdapter.getNextDepartures(stopId);
```

## Adding a New City

To add support for a new city:

1. Create a directory: `src/adapters/{city-name}/`
2. Create `config.ts` with city configuration
3. Implement `{city-name}-adapter.ts` that implements `TransitAdapter`
4. Export from `index.ts`
5. Add to `src/adapters/index.ts`

See the Paris adapter as a reference implementation.

## Configuration

Each adapter has an `AdapterConfig` that defines:

- **cityName**: Display name
- **timezone**: IANA timezone (e.g., "Europe/Paris")
- **boundingBox**: Geographic bounds [minLat, minLon, maxLat, maxLon]
- **defaultCenter**: Map center coordinates [lat, lon]
- **defaultZoom**: Initial map zoom level
- **currency**: ISO currency code
- **distanceUnit**: 'metric' or 'imperial'
- **supportedLocales**: Language codes

## Data Flow

```
GTFS Static Data (CSV files)
    ↓
Parser (future: gtfs-parser.ts)
    ↓
Database (SQLite via database.ts)
    ↓
Adapter (city-specific)
    ↓
App Components
```

## Status

- ✅ Step 5: Adapter interface defined
- ✅ Step 5: Paris adapter implemented (static data)
- ⏳ Step 10: Real-time SIRI-Lite API integration (planned)
- ⏳ Step 13: Alerts and disruptions (planned)
- ⏳ Step 18: Second city adapter for validation (planned)

## Notes

- The Paris adapter currently loads data from SQLite
- GTFS download and import will be added later
- Real-time departures currently use static schedule data
- Alerts API integration is planned for step 13
