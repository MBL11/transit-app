# GTFS Parser

Parser for GTFS (General Transit Feed Specification) data files.

## Usage

### Loading GTFS Files

```typescript
import { loadGTFSFile, parseStops } from '@/core';

// Load GTFS file from filesystem
const stopsContent = await loadGTFSFile('/path/to/stops.txt');
const stopsResult = parseStops(stopsContent);
console.log(stopsResult.data); // Array of Stop objects
```

### Parsing GTFS Data

```typescript
import { parseGTFS, parseStops, parseRoutes } from '@/core';

// Parse individual files
const stopsResult = parseStops(stopsCsvContent);
console.log(stopsResult.data); // Array of Stop objects
console.log(stopsResult.errors); // Parse errors if any

// Parse all GTFS files at once
const gtfsData = parseGTFS({
  stops: stopsCsvContent,
  routes: routesCsvContent,
  trips: tripsCsvContent,
  stopTimes: stopTimesCsvContent,
  shapes: shapesCsvContent, // Optional
  calendar: calendarCsvContent, // Optional
  calendarDates: calendarDatesCsvContent, // Optional
  agency: agencyCsvContent, // Optional
});

console.log(gtfsData.data.stops); // Array of stops
console.log(gtfsData.data.routes); // Array of routes
console.log(gtfsData.errors); // Errors by file
```

## Supported Files

### Required
- `stops.txt` - Stop/station locations
- `routes.txt` - Transit routes/lines
- `trips.txt` - Individual trips
- `stop_times.txt` - Stop times for each trip

### Optional
- `shapes.txt` - Route shapes (polylines)
- `calendar.txt` - Service schedules
- `calendar_dates.txt` - Service exceptions
- `agency.txt` - Transit agencies

## Types

All GTFS types are fully typed with TypeScript:

```typescript
import type { Stop, Route, Trip, StopTime, GTFSData } from '@/core';
```

## Error Handling

Each parse function returns:
- `data`: Array of parsed objects
- `errors`: Array of parse errors (if any)

```typescript
const result = parseStops(csvContent);

if (result.errors.length > 0) {
  console.error('Parse errors:', result.errors);
}

// Use the data even if there are some errors
const validStops = result.data;
```

## Encoding

UTF-8 encoding is supported by default. All CSV content is expected to be valid UTF-8.
