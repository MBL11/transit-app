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
 * Also handles İzmir GTFS format where lat/lon may be swapped or in wrong columns
 */
export function normalizeStop(gtfsStop: GTFSStop): Stop {
  // Handle various column name formats (lowercase transformed by parser)
  const rawStop = gtfsStop as Record<string, string>;

  const id = rawStop.stop_id || rawStop.stopid || rawStop.id || '';
  const name = rawStop.stop_name || rawStop.stopname || rawStop.name || '';

  // Try multiple column names for coordinates
  let latStr = rawStop.stop_lat || rawStop.stoplat || rawStop.lat || rawStop.latitude || '';
  let lonStr = rawStop.stop_lon || rawStop.stoplon || rawStop.lon || rawStop.longitude || '';

  let lat = parseFloat(latStr);
  let lon = parseFloat(lonStr);

  // İzmir area bounding box (extended for safety)
  const IZMIR_LAT_MIN = 37.5;
  const IZMIR_LAT_MAX = 39.5;
  const IZMIR_LON_MIN = 26.0;
  const IZMIR_LON_MAX = 28.5;

  // Check if coordinates are already valid for İzmir
  const isAlreadyValidIzmir = (
    !isNaN(lat) && !isNaN(lon) &&
    lat >= IZMIR_LAT_MIN && lat <= IZMIR_LAT_MAX &&
    lon >= IZMIR_LON_MIN && lon <= IZMIR_LON_MAX
  );

  if (!isAlreadyValidIzmir) {
    const zoneIdVal = parseFloat(rawStop.zone_id || '');
    const stopUrlVal = parseFloat(rawStop.stop_url || '');

    // Format 1: Turkish comma-decimal format (İzdeniz ferry GTFS)
    // CSV uses comma as both delimiter and decimal separator
    // "38,418611111111" gets split into stop_lat=38, stop_lon=418611111111
    // Real lat = 38 + 0.418611111111, real lon is in zone_id + stop_url
    const hasTurkishCommaFormat = (
      !isNaN(lat) && lat >= 37 && lat <= 40 && Number.isInteger(lat) &&
      !isNaN(lon) && lon > 1000000 && // decimal part as huge integer
      !isNaN(zoneIdVal) && zoneIdVal >= 26 && zoneIdVal <= 29 && Number.isInteger(zoneIdVal) &&
      !isNaN(stopUrlVal) && stopUrlVal > 1000000
    );

    // Format 2: ESHOT shifted format
    // stop_lat:"27", stop_lon:"2289", zone_id:"38", stop_url:"4656"
    const hasShiftedFormat = (
      !isNaN(lat) && lat >= 26 && lat <= 28 &&
      !isNaN(zoneIdVal) && zoneIdVal >= 37 && zoneIdVal <= 40 &&
      !isNaN(lon) && lon > 100 && // lon decimal is large number
      !isNaN(stopUrlVal) && stopUrlVal > 100 // lat decimal is large number
    );

    if (hasTurkishCommaFormat) {
      // Turkish comma-decimal: lat=38 lon=418611111111 zone_id=27 stop_url=130000000000
      const latDecDigits = lon.toString().length;
      const lonDecDigits = stopUrlVal.toString().length;
      const realLat = lat + lon / Math.pow(10, latDecDigits);
      const realLon = zoneIdVal + stopUrlVal / Math.pow(10, lonDecDigits);

      console.log(`[GTFSParser] Turkish comma format: ${name} -> lat=${realLat.toFixed(6)}, lon=${realLon.toFixed(6)}`);
      lat = realLat;
      lon = realLon;
    } else if (hasShiftedFormat) {
      // ESHOT shifted format
      const lonInt = lat;
      const lonDec = lon / 10000;
      const latInt = zoneIdVal;
      const latDec = stopUrlVal / 10000;

      lat = latInt + latDec;
      lon = lonInt + lonDec;
    } else if (lat > 40 && lon < 30) {
      // Simple lat/lon swap detection
      [lat, lon] = [lon, lat];
    }
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
 * İzmir transit line colors (official)
 */
const IZMIR_LINE_COLORS: Record<string, { color: string; textColor: string }> = {
  // Metro - Red (official)
  'M1': { color: '#E30613', textColor: '#FFFFFF' },
  'M2': { color: '#E30613', textColor: '#FFFFFF' },
  'M3': { color: '#E30613', textColor: '#FFFFFF' },
  'M4': { color: '#E30613', textColor: '#FFFFFF' },
  // Tramway - Green (official), Çiğli has light blue/pink for directions
  'T1': { color: '#00A651', textColor: '#FFFFFF' }, // Green
  'T2': { color: '#00A651', textColor: '#FFFFFF' }, // Green
  'CIGLI-IC': { color: '#5BC0DE', textColor: '#000000' }, // Light Blue (inner)
  'CIGLI-DIS': { color: '#FF69B4', textColor: '#000000' }, // Pink (outer)
  // İZBAN - Blue (official)
  'S1': { color: '#0066B3', textColor: '#FFFFFF' },
  'S2': { color: '#0066B3', textColor: '#FFFFFF' },
  'IZBAN': { color: '#0066B3', textColor: '#FFFFFF' },
  'İZBAN': { color: '#0066B3', textColor: '#FFFFFF' },
  // Ferry - Dark Blue
  'F1': { color: '#003366', textColor: '#FFFFFF' },
  'F2': { color: '#003366', textColor: '#FFFFFF' },
  'VAPUR': { color: '#003366', textColor: '#FFFFFF' },
};

/**
 * Normalize GTFS route to internal Route model
 */
export function normalizeRoute(gtfsRoute: GTFSRoute): Route {
  const rawRoute = gtfsRoute as Record<string, string>;

  // Try multiple column names for shortName (handle different GTFS formats)
  let shortName = rawRoute.route_short_name || rawRoute.routeshortname || rawRoute.short_name || '';

  // If shortName is empty, use route_id or long_name as fallback
  if (!shortName || shortName.trim() === '') {
    shortName = rawRoute.route_id || rawRoute.route_long_name || 'Unknown';
    // Truncate if too long
    if (shortName.length > 10) {
      shortName = shortName.substring(0, 10);
    }
  }

  // Debug first few routes only
  const routeId = rawRoute.route_id || '';
  if (routeId === '1' || routeId === '2' || routeId.toLowerCase().includes('m1')) {
    console.log(`[GTFSParser] Route ${routeId}: shortName="${shortName}", longName="${rawRoute.route_long_name}"`);
  }

  // Try to get İzmir-specific colors first
  let color = rawRoute.route_color || '';
  let textColor = rawRoute.route_text_color || '';

  // If no color provided, use İzmir defaults based on short name or route type
  if (!color || color === 'FFFFFF' || color === '') {
    const izmirColor = IZMIR_LINE_COLORS[shortName.toUpperCase()];
    if (izmirColor) {
      color = izmirColor.color;
      textColor = izmirColor.textColor;
    } else {
      // Fallback based on route type
      const routeType = parseInt(rawRoute.route_type || '3', 10);
      switch (routeType) {
        case 0: // Tram
          color = '#FF6600';
          textColor = '#FFFFFF';
          break;
        case 1: // Metro
          color = '#E30613';
          textColor = '#FFFFFF';
          break;
        case 2: // Rail (İZBAN)
          color = '#00A651';
          textColor = '#FFFFFF';
          break;
        case 3: // Bus
          color = '#0066CC';
          textColor = '#FFFFFF';
          break;
        case 4: // Ferry
          color = '#003366';
          textColor = '#FFFFFF';
          break;
        default:
          color = '#666666';
          textColor = '#FFFFFF';
      }
    }
  }

  // Ensure # prefix for hex colors
  if (!color.startsWith('#')) {
    color = '#' + color;
  }
  if (!textColor.startsWith('#')) {
    textColor = '#' + textColor;
  }

  return {
    id: rawRoute.route_id || '',
    shortName,
    longName: rawRoute.route_long_name || shortName,
    type: parseInt(rawRoute.route_type || '3', 10),
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

  // Debug: log first few raw stops to see column names and values
  if (rawStops.length > 0) {
    console.log('[GTFSParser] Sample raw stop 0:', JSON.stringify(rawStops[0]));
    if (rawStops.length > 1) {
      console.log('[GTFSParser] Sample raw stop 1:', JSON.stringify(rawStops[1]));
    }
  }

  // Normalize to internal models
  console.log('[GTFSParser] Normalizing data...');
  const allStops = rawStops.map(normalizeStop);
  const routes = rawRoutes.map(normalizeRoute);
  const trips = rawTrips.map(normalizeTrip);
  const stopTimes = rawStopTimes.map(normalizeStopTime);

  // Debug: log first few normalized stops
  if (allStops.length > 0) {
    console.log('[GTFSParser] Normalized stop 0:', JSON.stringify(allStops[0]));
    if (allStops.length > 1) {
      console.log('[GTFSParser] Normalized stop 1:', JSON.stringify(allStops[1]));
    }
  }

  // Filter out stops with invalid coordinates
  const stops = filterValidStops(allStops);
  const filteredCount = allStops.length - stops.length;
  if (filteredCount > 0) {
    console.warn(`[GTFSParser] Filtered out ${filteredCount} stops with invalid coordinates`);
    // Log some filtered stops for debugging
    const invalidStops = allStops.filter(s => !stops.includes(s)).slice(0, 3);
    invalidStops.forEach(s => {
      console.warn(`[GTFSParser] Filtered stop: id=${s.id}, name=${s.name}, lat=${s.lat}, lon=${s.lon}`);
    });
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
