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
  GTFSCalendar,
  GTFSCalendarDate,
  GTFSFeed,
} from './types/gtfs';
import type { Stop, Route, Trip, StopTime, Calendar, CalendarDate } from './types/models';
import { logger } from '../utils/logger';

/**
 * Parse CSV string to typed objects
 * Handles malformed CSVs with extra fields (common in Turkish GTFS feeds)
 */
function parseCSV<T>(csvContent: string, fileName: string): T[] {
  logger.log(`[GTFSParser] Parsing ${fileName}...`);

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
    logger.warn(`[GTFSParser] Errors in ${fileName}:`, realErrors.slice(0, 5));
  }

  if (result.errors && result.errors.length > 0) {
    logger.log(`[GTFSParser] Note: ${result.errors.length} field count warnings in ${fileName} (handled)`);
  }

  logger.log(`[GTFSParser] ✅ Parsed ${result.data.length} rows from ${fileName}`);
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
 * Parse calendar.txt (optional)
 */
export function parseCalendar(csvContent: string): GTFSCalendar[] {
  return parseCSV<GTFSCalendar>(csvContent, 'calendar.txt');
}

/**
 * Parse calendar_dates.txt (optional)
 */
export function parseCalendarDates(csvContent: string): GTFSCalendarDate[] {
  return parseCSV<GTFSCalendarDate>(csvContent, 'calendar_dates.txt');
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
    // Log raw column data for debugging coordinate issues
    if (!isAlreadyValidIzmir && (lon > 1000000 || isNaN(lon) || isNaN(lat))) {
      logger.log(`[GTFSParser] ⚠️ Invalid coords for "${name}" (id=${id}):`);
      logger.log(`  Raw: stop_lat="${latStr}" stop_lon="${lonStr}" zone_id="${rawStop.zone_id}" stop_url="${rawStop.stop_url}" extra="${(rawStop as any).__parsed_extra}"`);
      logger.log(`  Parsed: lat=${lat} lon=${lon}`);
    }

    const zoneIdVal = parseFloat(rawStop.zone_id || '');
    const stopUrlVal = parseFloat(rawStop.stop_url || '');

    // Access PapaParse extra fields (when more CSV values than headers)
    // İzdeniz ferry GTFS has Turkish comma-decimal format: "38,4186" splits into 2 columns
    // The longitude decimal part ends up in __parsed_extra[0]
    const parsedExtra = (rawStop as any).__parsed_extra as string[] | undefined;
    const extraStr0 = parsedExtra && parsedExtra.length > 0 ? parsedExtra[0].trim() : '';
    const extraVal0 = extraStr0 ? parseFloat(extraStr0) : NaN;

    // Raw string values for digit counting (preserves leading zeros like "0943", "097777")
    const lonRawStr = (rawStop.stop_lon || rawStop.stoplon || lonStr || '').trim();
    const stopUrlRawStr = (rawStop.stop_url || '').trim();

    // Format 1: Turkish comma-decimal format (İzdeniz ferry GTFS)
    // stop_lat is integer (38), stop_lon has lat decimal part, zone_id has lon integer,
    // __parsed_extra[0] has lon decimal part
    // Works for all precision levels (4-12 decimal digits)
    const hasTurkishCommaFormat = (
      !isNaN(lat) && lat >= 37 && lat <= 40 && Math.floor(lat) === lat &&
      !isNaN(lon) && lon !== lat && // lon column has the lat decimal part (any precision)
      !isNaN(zoneIdVal) && zoneIdVal >= 26 && zoneIdVal <= 29 && Math.floor(zoneIdVal) === zoneIdVal &&
      !isNaN(extraVal0) && extraVal0 > 0 // lon decimal part in __parsed_extra
    );

    // Format 2: Turkish comma with stop_url column available (alternate header format)
    const hasTurkishCommaViaStopUrl = (
      !hasTurkishCommaFormat &&
      !isNaN(lat) && lat >= 37 && lat <= 40 && Math.floor(lat) === lat &&
      !isNaN(lon) && lon !== lat &&
      !isNaN(zoneIdVal) && zoneIdVal >= 26 && zoneIdVal <= 29 && Math.floor(zoneIdVal) === zoneIdVal &&
      !isNaN(stopUrlVal) && stopUrlVal > 0
    );

    // Format 3: Metro İzmir shifted format (lat/lon fields swapped + Turkish comma)
    // stop_lat has lon integer (26-29), stop_lon has lon decimal, zone_id has lat integer (37-40), stop_url has lat decimal
    // Decimal precision varies: 2-6 digits, may have leading zeros (e.g., "0943", "057")
    const hasShiftedFormat = (
      !isNaN(lat) && lat >= 26 && lat <= 29 && Math.floor(lat) === lat &&
      !isNaN(zoneIdVal) && zoneIdVal >= 37 && zoneIdVal <= 40 && Math.floor(zoneIdVal) === zoneIdVal &&
      !isNaN(lon) && lon > 0 &&
      !isNaN(stopUrlVal) && stopUrlVal > 0
    );

    if (hasTurkishCommaFormat) {
      // Use string lengths to preserve leading zeros (e.g., "097777" → 6 digits, not 5)
      const latDecDigits = lonRawStr.length;
      const lonDecDigits = extraStr0.length;
      const realLat = lat + lon / Math.pow(10, latDecDigits);
      const realLon = zoneIdVal + extraVal0 / Math.pow(10, lonDecDigits);

      logger.log(`[GTFSParser] ✅ Turkish comma: "${name}" -> lat=${realLat.toFixed(6)}, lon=${realLon.toFixed(6)}`);
      lat = realLat;
      lon = realLon;
    } else if (hasTurkishCommaViaStopUrl) {
      const latDecDigits = lonRawStr.length;
      const lonDecDigits = stopUrlRawStr.length;
      const realLat = lat + lon / Math.pow(10, latDecDigits);
      const realLon = zoneIdVal + stopUrlVal / Math.pow(10, lonDecDigits);

      logger.log(`[GTFSParser] ✅ Turkish comma (stop_url): "${name}" -> lat=${realLat.toFixed(6)}, lon=${realLon.toFixed(6)}`);
      lat = realLat;
      lon = realLon;
    } else if (hasShiftedFormat) {
      // Metro İzmir: stop_lat=lon_int, stop_lon=lon_dec, zone_id=lat_int, stop_url=lat_dec
      // Use string lengths to preserve leading zeros (e.g., "0943" → 4 digits → /10^4 = 0.0943)
      const lonDecDigits = lonRawStr.length;
      const latDecDigits = stopUrlRawStr.length;
      const realLat = zoneIdVal + stopUrlVal / Math.pow(10, latDecDigits);
      const realLon = lat + lon / Math.pow(10, lonDecDigits);

      logger.log(`[GTFSParser] ✅ Shifted format: "${name}" -> lat=${realLat.toFixed(6)}, lon=${realLon.toFixed(6)}`);
      lat = realLat;
      lon = realLon;
    } else if (lat > 40 && lon < 30) {
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
 * İzmir transit line colors (official, from İzmir rapid transit map)
 * Metro M1: Red (#D61C1F)
 * İZBAN: Dark blue (#005BBB), Tepeköy-Selçuk segment: lighter blue (#4A90E2)
 * Tram T1/T2: Green (#00A651)
 * Tram T3 Çiğli: Light blue inner (#4ABEFF) / Rose outer (#FF6EC7)
 * Ferry (Vapur): Turquoise (#0099CC)
 */
const IZMIR_LINE_COLORS: Record<string, { color: string; textColor: string }> = {
  // Metro - Red (kırmızı)
  'M1': { color: '#D61C1F', textColor: '#FFFFFF' },
  'M2': { color: '#D61C1F', textColor: '#FFFFFF' }, // Under construction
  // Tramway - Each line has a distinct color
  'T1': { color: '#00A651', textColor: '#FFFFFF' }, // Karşıyaka tram (green) - Alaybey → Mavişehir
  'T2': { color: '#F7941D', textColor: '#FFFFFF' }, // Konak tram (orange) - Fahrettin Altay → Halkapınar
  'T3': { color: '#9B59B6', textColor: '#FFFFFF' }, // Çiğli circular (purple)
  // T3 Çiğli directional variants
  'CIGLI-IC': { color: '#4ABEFF', textColor: '#000000' },  // İç Hat (inner, light blue)
  'CIGLI-DIS': { color: '#FF6EC7', textColor: '#000000' },  // Dış Hat (outer, rose/magenta)
  // İZBAN - Dark blue (mavi)
  'S1': { color: '#005BBB', textColor: '#FFFFFF' },
  'S2': { color: '#4A90E2', textColor: '#FFFFFF' }, // Tepeköy-Selçuk segment (lighter blue)
  'IZBAN': { color: '#005BBB', textColor: '#FFFFFF' },
  'İZBAN': { color: '#005BBB', textColor: '#FFFFFF' },
  // Ferry (İzdeniz/Vapur) - Turquoise
  'F1': { color: '#0099CC', textColor: '#FFFFFF' },
  'F2': { color: '#0099CC', textColor: '#FFFFFF' },
  'VAPUR': { color: '#0099CC', textColor: '#FFFFFF' },
};

/**
 * Normalize GTFS route to internal Route model
 */
export function normalizeRoute(gtfsRoute: GTFSRoute): Route {
  const rawRoute = gtfsRoute as Record<string, string>;

  // Try multiple column names for shortName (handle different GTFS formats)
  let shortName = rawRoute.route_short_name || rawRoute.routeshortname || rawRoute.short_name || '';

  // If shortName is empty, generate a meaningful one
  if (!shortName || shortName.trim() === '') {
    const routeType = parseInt(rawRoute.route_type || '3', 10);
    const longName = rawRoute.route_long_name || '';

    if (routeType === 4 && longName) {
      // Ferry routes: abbreviate from long name (e.g., "Bostanlı - Konak - Bostanlı" → "BOS-KON")
      const parts = longName.split(/\s*[-–|]\s*/).filter(Boolean);
      // Get unique terminus names (remove duplicates like "Bostanlı - Konak - Bostanlı")
      const unique: string[] = [];
      for (const p of parts) {
        const trimmed = p.trim().replace(/\s*\(.*\)\s*/, ''); // Remove parenthetical
        const short = trimmed.substring(0, 3).toUpperCase();
        if (!unique.includes(short)) unique.push(short);
        if (unique.length >= 2) break;
      }
      shortName = unique.join('-') || rawRoute.route_id || 'Vapur';
    } else if (routeType === 0) {
      // Tram routes: İzmir has T1 (Karşıyaka) and T2 (Konak/Fahrettin Altay → Halkapınar)
      const id = rawRoute.route_id || '';
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        // İzmir GTFS mapping: route_ids 1,2 = T2 (Konak line), 3,4 = T1 (Karşıyaka line)
        // T2: Fahrettin Altay → Alsancak Gar → Halkapınar
        // T1: Alaybey → Karşıyaka → Mavişehir
        shortName = numericId <= 2 ? 'T2' : 'T1';
      } else {
        shortName = `T${id}`;
      }
    } else if (routeType === 1) {
      // Metro routes: generate M1, M2, etc.
      const id = rawRoute.route_id || '';
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        shortName = `M${Math.ceil(numericId / 2)}`;
      } else {
        shortName = `M${id}`;
      }
    } else {
      shortName = rawRoute.route_id || rawRoute.route_long_name || 'Unknown';
      // Truncate if too long
      if (shortName.length > 10) {
        shortName = shortName.substring(0, 10);
      }
    }
  }

  // Debug first few routes only
  const routeId = rawRoute.route_id || '';
  if (routeId === '1' || routeId === '2' || routeId.toLowerCase().includes('m1')) {
    logger.log(`[GTFSParser] Route ${routeId}: shortName="${shortName}", longName="${rawRoute.route_long_name}"`);
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
      // Fallback based on route type (official İzmir map colors)
      const routeType = parseInt(rawRoute.route_type || '3', 10);
      switch (routeType) {
        case 0: // Tram - Green (yeşil)
          color = '#00A651';
          textColor = '#FFFFFF';
          break;
        case 1: // Metro - Red (kırmızı)
          color = '#D61C1F';
          textColor = '#FFFFFF';
          break;
        case 2: // İZBAN / Rail - Dark Blue (mavi)
          color = '#005BBB';
          textColor = '#FFFFFF';
          break;
        case 3: // Bus (ESHOT) - Blue
          color = '#0066CC';
          textColor = '#FFFFFF';
          break;
        case 4: // Ferry (İzdeniz/Vapur) - Turquoise
          color = '#0099CC';
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
 * Normalize GTFS calendar to internal Calendar model
 */
export function normalizeCalendar(gtfsCal: GTFSCalendar): Calendar {
  return {
    serviceId: gtfsCal.service_id,
    monday: gtfsCal.monday === '1',
    tuesday: gtfsCal.tuesday === '1',
    wednesday: gtfsCal.wednesday === '1',
    thursday: gtfsCal.thursday === '1',
    friday: gtfsCal.friday === '1',
    saturday: gtfsCal.saturday === '1',
    sunday: gtfsCal.sunday === '1',
    startDate: gtfsCal.start_date,
    endDate: gtfsCal.end_date,
  };
}

/**
 * Normalize GTFS calendar date to internal CalendarDate model
 */
export function normalizeCalendarDate(gtfsCalDate: GTFSCalendarDate): CalendarDate {
  return {
    serviceId: gtfsCalDate.service_id,
    date: gtfsCalDate.date,
    exceptionType: parseInt(gtfsCalDate.exception_type, 10),
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
  calendar?: string;
  calendarDates?: string;
}): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
  calendar?: Calendar[];
  calendarDates?: CalendarDate[];
} {
  logger.log('[GTFSParser] Parsing complete GTFS feed...');

  // Parse raw GTFS data
  const rawStops = parseStops(feedData.stops);
  const rawRoutes = parseRoutes(feedData.routes);
  const rawTrips = parseTrips(feedData.trips);
  const rawStopTimes = parseStopTimes(feedData.stopTimes);

  // Debug: log first few raw stops to see column names and values
  if (rawStops.length > 0) {
    logger.log('[GTFSParser] Sample raw stop 0:', JSON.stringify(rawStops[0]));
    if (rawStops.length > 1) {
      logger.log('[GTFSParser] Sample raw stop 1:', JSON.stringify(rawStops[1]));
    }
  }

  // Normalize to internal models
  logger.log('[GTFSParser] Normalizing data...');
  const allStops = rawStops.map(normalizeStop);
  const routes = rawRoutes.map(normalizeRoute);
  const trips = rawTrips.map(normalizeTrip);
  const stopTimes = rawStopTimes.map(normalizeStopTime);

  // Debug: log first few normalized stops
  if (allStops.length > 0) {
    logger.log('[GTFSParser] Normalized stop 0:', JSON.stringify(allStops[0]));
    if (allStops.length > 1) {
      logger.log('[GTFSParser] Normalized stop 1:', JSON.stringify(allStops[1]));
    }
  }

  // Filter out stops with invalid coordinates
  const stops = filterValidStops(allStops);
  const filteredCount = allStops.length - stops.length;
  if (filteredCount > 0) {
    logger.warn(`[GTFSParser] Filtered out ${filteredCount} stops with invalid coordinates`);
    // Log some filtered stops for debugging
    const invalidStops = allStops.filter(s => !stops.includes(s)).slice(0, 3);
    invalidStops.forEach(s => {
      logger.warn(`[GTFSParser] Filtered stop: id=${s.id}, name=${s.name}, lat=${s.lat}, lon=${s.lon}`);
    });
  }

  // Parse optional calendar data
  let calendar: Calendar[] | undefined;
  let calendarDates: CalendarDate[] | undefined;

  if (feedData.calendar) {
    const rawCalendar = parseCalendar(feedData.calendar);
    calendar = rawCalendar.map(normalizeCalendar);
    logger.log(`[GTFSParser] Parsed ${calendar.length} calendar entries`);
  }

  if (feedData.calendarDates) {
    const rawCalendarDates = parseCalendarDates(feedData.calendarDates);
    calendarDates = rawCalendarDates.map(normalizeCalendarDate);
    logger.log(`[GTFSParser] Parsed ${calendarDates.length} calendar date exceptions`);
  }

  logger.log('[GTFSParser] ✅ GTFS feed parsed successfully');
  logger.log(`  - ${stops.length} stops (${filteredCount} filtered)`);
  logger.log(`  - ${routes.length} routes`);
  logger.log(`  - ${trips.length} trips`);
  logger.log(`  - ${stopTimes.length} stop times`);
  if (calendar) logger.log(`  - ${calendar.length} calendar entries`);
  if (calendarDates) logger.log(`  - ${calendarDates.length} calendar date exceptions`);

  return { stops, routes, trips, stopTimes, calendar, calendarDates };
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
  logger.log('[GTFSParser] Loading GTFS data from URLs...');

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
      logger.warn(`[GTFSParser] ⚠️ ${invalidStops.length} stops with invalid coordinates:`);
      invalidStops.slice(0, 5).forEach(s => {
        logger.warn(`  - ${s.id}: lat=${s.lat}, lon=${s.lon}`);
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
    logger.error('[GTFSParser] ❌ Validation failed:', errors);
  } else if (warnings.length > 0) {
    logger.warn('[GTFSParser] ⚠️ Validation passed with warnings:', warnings);
  } else {
    logger.log('[GTFSParser] ✅ Validation passed');
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
