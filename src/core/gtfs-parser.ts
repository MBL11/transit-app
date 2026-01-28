/**
 * GTFS Parser
 * Parses GTFS static data from CSV files
 */

import Papa from 'papaparse';
import type {
  GTFSStop,
  GTFSRoute,
  GTFSTrip,
  GTFSStopTime,
  GTFSShape,
  GTFSFeed,
} from './types/gtfs';
import type { Stop, Route, Trip, StopTime } from './types/models';

/**
 * Parse CSV string to typed objects
 * Handles malformed CSVs with extra fields (common in Turkish GTFS feeds)
 */
function parseCSV<T>(csvContent: string, fileName: string): T[] {
  console.log(`[GTFSParser] Parsing ${fileName}...`);

  const result = Papa.parse<T>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => header.trim().toLowerCase(),
    transform: (value: string) => value.trim(),
    // Don't fail on field count mismatches - common in İzmir GTFS
    delimiter: ',',
    quoteChar: '"',
  });

  // Only log real errors, not field mismatch warnings
  const realErrors = result.errors?.filter(e => e.code !== 'TooManyFields' && e.code !== 'TooFewFields') || [];
  if (realErrors.length > 0) {
    console.warn(`[GTFSParser] Errors in ${fileName}:`, realErrors.slice(0, 5));
  }

  if (result.errors && result.errors.length > 0) {
    console.log(`[GTFSParser] Note: ${result.errors.length} field count warnings in ${fileName} (handled)`);
  }

  console.log(`[GTFSParser] ✅ Parsed ${result.data.length} rows from ${fileName}`);
  return result.data;
}

/**
 * Parse stops.txt
 */
export function parseStops(csvContent: string): GTFSStop[] {
  return parseCSV<GTFSStop>(csvContent, 'stops.txt');
}

/**
 * Parse routes.txt
 */
export function parseRoutes(csvContent: string): GTFSRoute[] {
  return parseCSV<GTFSRoute>(csvContent, 'routes.txt');
}

/**
 * Parse trips.txt
 */
export function parseTrips(csvContent: string): GTFSTrip[] {
  return parseCSV<GTFSTrip>(csvContent, 'trips.txt');
}

/**
 * Parse stop_times.txt
 */
export function parseStopTimes(csvContent: string): GTFSStopTime[] {
  return parseCSV<GTFSStopTime>(csvContent, 'stop_times.txt');
}

/**
 * Parse shapes.txt (optional)
 */
export function parseShapes(csvContent: string): GTFSShape[] {
  return parseCSV<GTFSShape>(csvContent, 'shapes.txt');
}

/**
 * Normalize GTFS stop to internal Stop model
 * Handles various column naming conventions (standard, lowercase, underscore variations)
 */
export function normalizeStop(gtfsStop: GTFSStop): Stop {
  // Handle various column name formats (lowercase transformed by parser)
  const rawStop = gtfsStop as Record<string, string>;

  const id = rawStop.stop_id || rawStop.stopid || rawStop.id || '';
  const name = rawStop.stop_name || rawStop.stopname || rawStop.name || '';

  // Try multiple column names for coordinates
  const latStr = rawStop.stop_lat || rawStop.stoplat || rawStop.lat || rawStop.latitude || '';
  const lonStr = rawStop.stop_lon || rawStop.stoplon || rawStop.lon || rawStop.longitude || '';

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  // Log warning if coordinates look wrong
  if (isNaN(lat) || isNaN(lon)) {
    console.warn(`[GTFSParser] Invalid coordinates for stop ${id}: lat=${latStr}, lon=${lonStr}`);
  }

  return {
    id,
    name,
    lat,
    lon,
    locationType: parseInt(rawStop.location_type || rawStop.locationtype || '0', 10),
    parentStation: rawStop.parent_station || rawStop.parentstation || undefined,
  };
}

/**
 * Normalize GTFS route to internal Route model
 */
export function normalizeRoute(gtfsRoute: GTFSRoute): Route {
  // Default colors if not provided
  let color = gtfsRoute.route_color || 'FFFFFF';
  let textColor = gtfsRoute.route_text_color || '000000';

  // Ensure # prefix for hex colors
  if (!color.startsWith('#')) {
    color = '#' + color;
  }
  if (!textColor.startsWith('#')) {
    textColor = '#' + textColor;
  }

  return {
    id: gtfsRoute.route_id,
    shortName: gtfsRoute.route_short_name,
    longName: gtfsRoute.route_long_name,
    type: parseInt(gtfsRoute.route_type, 10),
    color,
    textColor,
  };
}

/**
 * Normalize GTFS trip to internal Trip model
 */
export function normalizeTrip(gtfsTrip: GTFSTrip): Trip {
  return {
    id: gtfsTrip.trip_id,
    routeId: gtfsTrip.route_id,
    serviceId: gtfsTrip.service_id,
    headsign: gtfsTrip.trip_headsign || undefined,
    directionId: parseInt(gtfsTrip.direction_id || '0', 10),
    shapeId: gtfsTrip.shape_id || undefined,
  };
}

/**
 * Normalize GTFS stop time to internal StopTime model
 */
export function normalizeStopTime(gtfsStopTime: GTFSStopTime): StopTime {
  return {
    tripId: gtfsStopTime.trip_id,
    arrivalTime: gtfsStopTime.arrival_time,
    departureTime: gtfsStopTime.departure_time,
    stopId: gtfsStopTime.stop_id,
    stopSequence: parseInt(gtfsStopTime.stop_sequence, 10),
  };
}

/**
 * Parse and normalize all GTFS data
 * Automatically filters out stops with invalid coordinates
 */
export function parseGTFSFeed(feedData: {
  stops: string;
  routes: string;
  trips: string;
  stopTimes: string;
  shapes?: string;
}): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
} {
  console.log('[GTFSParser] Parsing complete GTFS feed...');

  // Parse raw GTFS data
  const rawStops = parseStops(feedData.stops);
  const rawRoutes = parseRoutes(feedData.routes);
  const rawTrips = parseTrips(feedData.trips);
  const rawStopTimes = parseStopTimes(feedData.stopTimes);

  // Debug: log first raw stop to see column names
  if (rawStops.length > 0) {
    console.log('[GTFSParser] Sample raw stop:', JSON.stringify(rawStops[0]));
  }

  // Normalize to internal models
  console.log('[GTFSParser] Normalizing data...');
  const allStops = rawStops.map(normalizeStop);
  const routes = rawRoutes.map(normalizeRoute);
  const trips = rawTrips.map(normalizeTrip);
  const stopTimes = rawStopTimes.map(normalizeStopTime);

  // Filter out stops with invalid coordinates
  const stops = filterValidStops(allStops);
  const filteredCount = allStops.length - stops.length;
  if (filteredCount > 0) {
    console.warn(`[GTFSParser] Filtered out ${filteredCount} stops with invalid coordinates`);
  }

  console.log('[GTFSParser] ✅ GTFS feed parsed successfully');
  console.log(`  - ${stops.length} stops (${filteredCount} filtered)`);
  console.log(`  - ${routes.length} routes`);
  console.log(`  - ${trips.length} trips`);
  console.log(`  - ${stopTimes.length} stop times`);

  return { stops, routes, trips, stopTimes };
}

/**
 * Load GTFS data from URLs
 * Note: In React Native, you'll need to use fetch or expo-file-system
 */
export async function loadGTFSFromURLs(urls: {
  stops: string;
  routes: string;
  trips: string;
  stopTimes: string;
  shapes?: string;
}): Promise<{
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
}> {
  console.log('[GTFSParser] Loading GTFS data from URLs...');

  const [stopsText, routesText, tripsText, stopTimesText] = await Promise.all([
    fetch(urls.stops).then((r) => r.text()),
    fetch(urls.routes).then((r) => r.text()),
    fetch(urls.trips).then((r) => r.text()),
    fetch(urls.stopTimes).then((r) => r.text()),
  ]);

  return parseGTFSFeed({
    stops: stopsText,
    routes: routesText,
    trips: tripsText,
    stopTimes: stopTimesText,
  });
}

/**
 * Validate GTFS data structure
 * Returns warnings for invalid data but doesn't fail unless there's no valid data at all
 */
export function validateGTFSData(data: {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
}): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required data
  if (data.stops.length === 0) {
    errors.push('No stops found');
  }
  if (data.routes.length === 0) {
    errors.push('No routes found');
  }
  if (data.trips.length === 0) {
    errors.push('No trips found');
  }
  if (data.stopTimes.length === 0) {
    errors.push('No stop times found');
  }

  // Check for invalid coordinates - warn but don't fail
  const invalidStops = data.stops.filter(
    (s) => isNaN(s.lat) || isNaN(s.lon) || s.lat < -90 || s.lat > 90 || s.lon < -180 || s.lon > 180
  );
  if (invalidStops.length > 0) {
    const validStops = data.stops.length - invalidStops.length;
    if (validStops === 0) {
      errors.push(`All ${invalidStops.length} stops have invalid coordinates`);
    } else {
      warnings.push(`${invalidStops.length} stops with invalid coordinates (will be filtered out)`);
      console.warn(`[GTFSParser] ⚠️ ${invalidStops.length} stops with invalid coordinates:`);
      invalidStops.slice(0, 5).forEach(s => {
        console.warn(`  - ${s.id}: lat=${s.lat}, lon=${s.lon}`);
      });
    }
  }

  // Check for missing route colors
  const missingColors = data.routes.filter((r) => !r.color || r.color === '#FFFFFF');
  if (missingColors.length > 0) {
    warnings.push(`${missingColors.length} routes missing colors`);
  }

  const isValid = errors.length === 0;
  if (!isValid) {
    console.error('[GTFSParser] ❌ Validation failed:', errors);
  } else if (warnings.length > 0) {
    console.warn('[GTFSParser] ⚠️ Validation passed with warnings:', warnings);
  } else {
    console.log('[GTFSParser] ✅ Validation passed');
  }

  return { isValid, errors, warnings };
}

/**
 * Filter stops with valid coordinates
 * İzmir GTFS bbox: approximately lat 38.2-38.6, lon 26.7-27.5
 */
export function filterValidStops(stops: Stop[]): Stop[] {
  return stops.filter(s => {
    const validLat = !isNaN(s.lat) && s.lat >= -90 && s.lat <= 90;
    const validLon = !isNaN(s.lon) && s.lon >= -180 && s.lon <= 180;
    return validLat && validLon;
  });
}
