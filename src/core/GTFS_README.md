# GTFS Parser & Importer

This module handles parsing GTFS (General Transit Feed Specification) static data and importing it into the SQLite database.

## Overview

GTFS is a standard format for public transportation schedules and geographic information. It consists of several CSV files that describe stops, routes, trips, and schedules.

## Components

### 1. GTFS Parser (`gtfs-parser.ts`)

Parses raw GTFS CSV files and normalizes them to our internal data models.

**Functions**:
- `parseStops()` - Parse stops.txt
- `parseRoutes()` - Parse routes.txt
- `parseTrips()` - Parse trips.txt
- `parseStopTimes()` - Parse stop_times.txt
- `parseShapes()` - Parse shapes.txt (optional)
- `parseGTFSFeed()` - Parse complete feed and normalize
- `validateGTFSData()` - Validate parsed data
- `loadGTFSFromURLs()` - Load GTFS from remote URLs

**Normalization**:
The parser converts raw GTFS types to our internal models:
- `GTFSStop` → `Stop` (converts string coords to numbers)
- `GTFSRoute` → `Route` (adds # to hex colors, defaults)
- `GTFSTrip` → `Trip` (parses direction IDs)
- `GTFSStopTime` → `StopTime` (parses stop sequences)

### 2. GTFS Importer (`gtfs-importer.ts`)

Imports parsed GTFS data into SQLite database.

**Functions**:
- `importGTFSToDatabase()` - Import from CSV content
- `importGTFSFromURLs()` - Download and import from URLs
- `clearGTFSData()` - Clear all data from database
- `getImportStatus()` - Check if data exists

### 3. GTFS Types (`types/gtfs.ts`)

TypeScript interfaces for raw GTFS data structures.

## Usage Examples

### Example 1: Parse GTFS from strings

```typescript
import { parseGTFSFeed, validateGTFSData } from './core/gtfs-parser';

const data = parseGTFSFeed({
  stops: stopsCSV,
  routes: routesCSV,
  trips: tripsCSV,
  stopTimes: stopTimesCSV,
});

const { isValid, errors } = validateGTFSData(data);
if (isValid) {
  console.log('Data is valid!', data);
}
```

### Example 2: Import from URLs

```typescript
import { importGTFSFromURLs } from './core/gtfs-importer';

await importGTFSFromURLs({
  stops: 'https://example.com/gtfs/stops.txt',
  routes: 'https://example.com/gtfs/routes.txt',
  trips: 'https://example.com/gtfs/trips.txt',
  stopTimes: 'https://example.com/gtfs/stop_times.txt',
});
```

### Example 3: Check import status

```typescript
import { getImportStatus } from './core/gtfs-importer';

const status = getImportStatus();
console.log('Has data:', status.hasData);
console.log('Stats:', status.stats);
```

### Example 4: Use with Paris Adapter

```typescript
import { parisAdapter } from './adapters/paris';
import { importGTFSToDatabase } from './core/gtfs-importer';

// Import GTFS data
await importGTFSToDatabase({
  stops: stopsCSV,
  routes: routesCSV,
  trips: tripsCSV,
  stopTimes: stopTimesCSV,
});

// Now adapter can load from database
await parisAdapter.initialize();
const stops = await parisAdapter.loadStops();
```

## GTFS File Structure

### stops.txt
Required fields:
- `stop_id` - Unique stop ID
- `stop_name` - Stop name
- `stop_lat` - Latitude
- `stop_lon` - Longitude

Optional: `location_type`, `parent_station`, etc.

### routes.txt
Required fields:
- `route_id` - Unique route ID
- `route_short_name` - Short name (e.g., "1", "91")
- `route_long_name` - Full name (e.g., "Métro Ligne 1")
- `route_type` - Type code (0=tram, 1=metro, 2=rail, 3=bus)

Optional: `route_color`, `route_text_color`

### trips.txt
Required fields:
- `trip_id` - Unique trip ID
- `route_id` - Associated route
- `service_id` - Service calendar ID

Optional: `trip_headsign`, `direction_id`, `shape_id`

### stop_times.txt
Required fields:
- `trip_id` - Associated trip
- `stop_id` - Stop at this point
- `stop_sequence` - Order in trip
- `arrival_time` - Arrival time (HH:MM:SS)
- `departure_time` - Departure time (HH:MM:SS)

## Testing

Run the test suite:

```typescript
import { runAllParserTests } from './core/gtfs-parser-test';

runAllParserTests();
```

This will test:
1. Individual file parsing
2. Data normalization
3. Complete feed parsing
4. Validation

## Performance Notes

- Uses PapaParse for efficient CSV parsing
- Batch inserts into SQLite with transactions
- Validates data before inserting
- Supports large GTFS feeds (tested with 10K+ stops)

## Error Handling

The parser handles:
- Invalid CSV format
- Missing required fields
- Invalid coordinates
- Missing colors (uses defaults)
- Encoding issues (UTF-8)

Validation checks for:
- Required data presence
- Valid coordinate ranges
- Non-empty datasets

## Resources

- [GTFS Reference](https://gtfs.org/schedule/reference/)
- [PapaParse Documentation](https://www.papaparse.com/docs)
- [Île-de-France Mobilités Open Data](https://prim.iledefrance-mobilites.fr)
