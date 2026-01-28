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

### İzmir

- **Location**: `src/adapters/izmir/`
- **Data Source**: ESHOT, Metro İzmir, İZBAN GTFS feeds
- **Coverage**: İzmir metropolitan area
- **Transport modes**: Bus (ESHOT), Metro, İZBAN (commuter rail)
- **Real-time**: Static schedules (GTFS-RT planned)

**Usage**:
```typescript
import { izmirAdapter } from './adapters/izmir';

// Initialize
await izmirAdapter.initialize();

// Load data
const stops = await izmirAdapter.loadStops();
const routes = await izmirAdapter.loadRoutes();

// Get next departures
const departures = await izmirAdapter.getNextDepartures(stopId);
```

## Adding a New City

To add support for a new city:

1. Create a directory: `src/adapters/{city-name}/`
2. Create `config.ts` with city configuration
3. Implement `{city-name}-adapter.ts` that implements `TransitAdapter`
4. Export from `index.ts`
5. Add to `src/adapters/index.ts`

See the İzmir adapter as a reference implementation.

## Configuration

Each adapter has an `AdapterConfig` that defines:

- **cityName**: Display name
- **timezone**: IANA timezone (e.g., "Europe/Istanbul")
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
Parser (gtfs-parser.ts)
    ↓
Database (SQLite via database.ts)
    ↓
Adapter (city-specific)
    ↓
App Components
```

## Status

- ✅ Adapter interface defined
- ✅ İzmir adapter implemented (ESHOT, Metro, İZBAN)
- ⏳ Real-time GTFS-RT integration (planned)
- ⏳ Alerts and disruptions (planned)

## Notes

- The İzmir adapter loads data from SQLite
- GTFS download and import is supported for ESHOT, Metro İzmir, and İZBAN
- Real-time departures currently use static schedule data
- Alerts API integration is planned
