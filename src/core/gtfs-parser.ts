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
 */
function parseCSV<T>(csvContent: string, fileName: string): T[] {
  console.log(`[GTFSParser] Parsing ${fileName}...`);

  const result = Papa.parse<T>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  if (result.errors && result.errors.length > 0) {
    console.warn(`[GTFSParser] Errors in ${fileName}:`, result.errors.slice(0, 5));
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
 */
export function normalizeStop(gtfsStop: GTFSStop): Stop {
  return {
    id: gtfsStop.stop_id,
    name: gtfsStop.stop_name,
    lat: parseFloat(gtfsStop.stop_lat),
    lon: parseFloat(gtfsStop.stop_lon),
    locationType: parseInt(gtfsStop.location_type || '0', 10),
    parentStation: gtfsStop.parent_station || undefined,
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

  // Normalize to internal models
  console.log('[GTFSParser] Normalizing data...');
  const stops = rawStops.map(normalizeStop);
  const routes = rawRoutes.map(normalizeRoute);
  const trips = rawTrips.map(normalizeTrip);
  const stopTimes = rawStopTimes.map(normalizeStopTime);

  console.log('[GTFSParser] ✅ GTFS feed parsed successfully');
  console.log(`  - ${stops.length} stops`);
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
 */
export function validateGTFSData(data: {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

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

  // Check for invalid coordinates
  const invalidStops = data.stops.filter(
    (s) => isNaN(s.lat) || isNaN(s.lon) || s.lat < -90 || s.lat > 90 || s.lon < -180 || s.lon > 180
  );
  if (invalidStops.length > 0) {
    errors.push(`${invalidStops.length} stops with invalid coordinates`);
  }

  // Check for missing route colors
  const missingColors = data.routes.filter((r) => !r.color || r.color === '#FFFFFF');
  if (missingColors.length > 0) {
    console.warn(`[GTFSParser] ⚠️ ${missingColors.length} routes missing colors`);
  }

  const isValid = errors.length === 0;
  if (!isValid) {
    console.error('[GTFSParser] ❌ Validation failed:', errors);
  } else {
    console.log('[GTFSParser] ✅ Validation passed');
  }

  return { isValid, errors };
}
