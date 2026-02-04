/**
 * SQLite database for storing GTFS data locally
 * Uses expo-sqlite for React Native
 */

import * as SQLite from 'expo-sqlite';
import type { Stop, Route, Trip, StopTime, Calendar, CalendarDate } from './types/models';
import { logger } from '../utils/logger';

const DATABASE_NAME = 'transit.db';

/**
 * Open database connection
 */
export function openDatabase(): SQLite.SQLiteDatabase {
  return SQLite.openDatabaseSync(DATABASE_NAME);
}

/**
 * Initialize database with tables and indexes
 */
export async function initializeDatabase(): Promise<void> {
  const db = openDatabase();

  logger.log('[Database] Initializing database...');

  try {
    // Enable WAL mode for concurrent reads during writes (prevents "database is locked" errors)
    db.execSync('PRAGMA journal_mode=WAL;');

    // Create stops table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS stops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        location_type INTEGER DEFAULT 0,
        parent_station TEXT
      );
    `);

    // Create routes table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        short_name TEXT NOT NULL,
        long_name TEXT NOT NULL,
        type INTEGER NOT NULL,
        color TEXT NOT NULL,
        text_color TEXT NOT NULL
      );
    `);

    // Create trips table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        headsign TEXT,
        direction_id INTEGER DEFAULT 0,
        shape_id TEXT,
        FOREIGN KEY (route_id) REFERENCES routes(id)
      );
    `);

    // Create stop_times table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS stop_times (
        trip_id TEXT NOT NULL,
        arrival_time TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        stop_id TEXT NOT NULL,
        stop_sequence INTEGER NOT NULL,
        PRIMARY KEY (trip_id, stop_sequence),
        FOREIGN KEY (trip_id) REFERENCES trips(id),
        FOREIGN KEY (stop_id) REFERENCES stops(id)
      );
    `);

    // Create shapes table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS shapes (
        shape_id TEXT NOT NULL,
        shape_pt_lat REAL NOT NULL,
        shape_pt_lon REAL NOT NULL,
        shape_pt_sequence INTEGER NOT NULL,
        PRIMARY KEY (shape_id, shape_pt_sequence)
      );
    `);

    // Create calendar table (service schedules by day of week)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS calendar (
        service_id TEXT PRIMARY KEY,
        monday INTEGER NOT NULL DEFAULT 0,
        tuesday INTEGER NOT NULL DEFAULT 0,
        wednesday INTEGER NOT NULL DEFAULT 0,
        thursday INTEGER NOT NULL DEFAULT 0,
        friday INTEGER NOT NULL DEFAULT 0,
        saturday INTEGER NOT NULL DEFAULT 0,
        sunday INTEGER NOT NULL DEFAULT 0,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL
      );
    `);

    // Create calendar_dates table (service exceptions)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS calendar_dates (
        service_id TEXT NOT NULL,
        date TEXT NOT NULL,
        exception_type INTEGER NOT NULL,
        PRIMARY KEY (service_id, date)
      );
    `);

    // Create indexes for performance
    logger.log('[Database] Creating indexes...');

    // Index on stops coordinates (for map queries)
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_stops_coords
      ON stops(lat, lon);
    `);

    // Index on stop_times for departure queries
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_stop_times_stop
      ON stop_times(stop_id, departure_time);
    `);

    // Index on trips by route
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_trips_route
      ON trips(route_id);
    `);

    // Index on stop_times by trip
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_stop_times_trip
      ON stop_times(trip_id, stop_sequence);
    `);

    // Index on stops name for search (COLLATE NOCASE for case-insensitive)
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_stops_name
      ON stops(name COLLATE NOCASE);
    `);

    // Index on stops parent_station for grouping
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_stops_parent
      ON stops(parent_station);
    `);

    // Index on routes short_name for search
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_routes_short_name
      ON routes(short_name COLLATE NOCASE);
    `);

    // Composite index for faster stop_times joins
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_stop_times_stop_trip
      ON stop_times(stop_id, trip_id);
    `);

    // Index on trips service_id for calendar filtering
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_trips_service
      ON trips(service_id);
    `);

    // Index on calendar_dates for quick date lookups
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_calendar_dates_date
      ON calendar_dates(date);
    `);

    logger.log('[Database] ✅ Database initialized successfully');
  } catch (error) {
    logger.error('[Database] ❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Drop all tables (for testing/reset)
 */
export async function dropAllTables(): Promise<void> {
  const db = openDatabase();

  logger.log('[Database] Dropping all tables...');

  try {
    db.execSync('DROP TABLE IF EXISTS calendar_dates;');
    db.execSync('DROP TABLE IF EXISTS calendar;');
    db.execSync('DROP TABLE IF EXISTS shapes;');
    db.execSync('DROP TABLE IF EXISTS stop_times;');
    db.execSync('DROP TABLE IF EXISTS trips;');
    db.execSync('DROP TABLE IF EXISTS routes;');
    db.execSync('DROP TABLE IF EXISTS stops;');

    logger.log('[Database] ✅ All tables dropped');
  } catch (error) {
    logger.error('[Database] ❌ Failed to drop tables:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): {
  stops: number;
  routes: number;
  trips: number;
  stopTimes: number;
} {
  const db = openDatabase();

  const stopsCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM stops'
  );
  const routesCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM routes'
  );
  const tripsCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM trips'
  );
  const stopTimesCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM stop_times'
  );

  return {
    stops: stopsCount?.count || 0,
    routes: routesCount?.count || 0,
    trips: tripsCount?.count || 0,
    stopTimes: stopTimesCount?.count || 0,
  };
}

/**
 * Check if database is empty (needs initial data load)
 */
export function isDatabaseEmpty(): boolean {
  const stats = getDatabaseStats();
  return stats.stops === 0 && stats.routes === 0;
}

/**
 * Clear all GTFS data from database
 * Creates tables first if they don't exist
 */
export async function clearAllData(): Promise<void> {
  logger.log('[Database] Clearing all data...');

  // First ensure tables exist
  await initializeDatabase();

  const db = openDatabase();

  try {
    db.execSync('BEGIN TRANSACTION;');
    db.execSync('DELETE FROM calendar_dates;');
    db.execSync('DELETE FROM calendar;');
    db.execSync('DELETE FROM stop_times;');
    db.execSync('DELETE FROM trips;');
    db.execSync('DELETE FROM routes;');
    db.execSync('DELETE FROM stops;');
    db.execSync('DELETE FROM shapes;');
    db.execSync('COMMIT;');
    logger.log('[Database] ✅ All data cleared');
  } catch (error) {
    db.execSync('ROLLBACK;');
    logger.error('[Database] ❌ Failed to clear data:', error);
    throw error;
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Insert stops in batch with transaction
 */
export async function insertStops(stops: Stop[]): Promise<void> {
  const db = openDatabase();

  logger.log(`[Database] Inserting ${stops.length} stops...`);

  try {
    db.execSync('BEGIN TRANSACTION;');

    const statement = db.prepareSync(
      'INSERT OR REPLACE INTO stops (id, name, lat, lon, location_type, parent_station) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const stop of stops) {
      statement.executeSync([
        stop.id,
        stop.name,
        stop.lat,
        stop.lon,
        stop.locationType,
        stop.parentStation || null,
      ]);
    }

    statement.finalizeSync();
    db.execSync('COMMIT;');

    logger.log(`[Database] ✅ ${stops.length} stops inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    logger.error('[Database] ❌ Failed to insert stops:', error);
    throw error;
  }
}

/**
 * Insert routes in batch with transaction
 */
export async function insertRoutes(routes: Route[]): Promise<void> {
  const db = openDatabase();

  logger.log(`[Database] Inserting ${routes.length} routes...`);

  try {
    db.execSync('BEGIN TRANSACTION;');

    const statement = db.prepareSync(
      'INSERT OR REPLACE INTO routes (id, short_name, long_name, type, color, text_color) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const route of routes) {
      statement.executeSync([
        route.id,
        route.shortName,
        route.longName,
        route.type,
        route.color,
        route.textColor,
      ]);
    }

    statement.finalizeSync();
    db.execSync('COMMIT;');

    logger.log(`[Database] ✅ ${routes.length} routes inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    logger.error('[Database] ❌ Failed to insert routes:', error);
    throw error;
  }
}

/**
 * Insert trips in batch with transaction
 */
export async function insertTrips(trips: Trip[]): Promise<void> {
  const db = openDatabase();

  logger.log(`[Database] Inserting ${trips.length} trips...`);

  try {
    db.execSync('BEGIN TRANSACTION;');

    const statement = db.prepareSync(
      'INSERT OR REPLACE INTO trips (id, route_id, service_id, headsign, direction_id, shape_id) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const trip of trips) {
      statement.executeSync([
        trip.id,
        trip.routeId,
        trip.serviceId,
        trip.headsign || null,
        trip.directionId,
        trip.shapeId || null,
      ]);
    }

    statement.finalizeSync();
    db.execSync('COMMIT;');

    logger.log(`[Database] ✅ ${trips.length} trips inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    logger.error('[Database] ❌ Failed to insert trips:', error);
    throw error;
  }
}

/**
 * Insert stop times in batch with transaction
 */
export async function insertStopTimes(stopTimes: StopTime[]): Promise<void> {
  const db = openDatabase();

  logger.log(`[Database] Inserting ${stopTimes.length} stop times...`);

  try {
    db.execSync('BEGIN TRANSACTION;');

    const statement = db.prepareSync(
      'INSERT OR REPLACE INTO stop_times (trip_id, arrival_time, departure_time, stop_id, stop_sequence) VALUES (?, ?, ?, ?, ?)'
    );

    for (const stopTime of stopTimes) {
      statement.executeSync([
        stopTime.tripId,
        stopTime.arrivalTime,
        stopTime.departureTime,
        stopTime.stopId,
        stopTime.stopSequence,
      ]);
    }

    statement.finalizeSync();
    db.execSync('COMMIT;');

    logger.log(`[Database] ✅ ${stopTimes.length} stop times inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    logger.error('[Database] ❌ Failed to insert stop times:', error);
    throw error;
  }
}

/**
 * Insert calendar entries in batch with transaction
 */
export async function insertCalendar(calendar: Calendar[]): Promise<void> {
  if (calendar.length === 0) return;
  const db = openDatabase();

  logger.log(`[Database] Inserting ${calendar.length} calendar entries...`);

  try {
    db.execSync('BEGIN TRANSACTION;');

    const statement = db.prepareSync(
      'INSERT OR REPLACE INTO calendar (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const cal of calendar) {
      statement.executeSync([
        cal.serviceId,
        cal.monday ? 1 : 0,
        cal.tuesday ? 1 : 0,
        cal.wednesday ? 1 : 0,
        cal.thursday ? 1 : 0,
        cal.friday ? 1 : 0,
        cal.saturday ? 1 : 0,
        cal.sunday ? 1 : 0,
        cal.startDate,
        cal.endDate,
      ]);
    }

    statement.finalizeSync();
    db.execSync('COMMIT;');

    logger.log(`[Database] ✅ ${calendar.length} calendar entries inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    logger.error('[Database] ❌ Failed to insert calendar:', error);
    throw error;
  }
}

/**
 * Insert calendar date exceptions in batch with transaction
 */
export async function insertCalendarDates(calendarDates: CalendarDate[]): Promise<void> {
  if (calendarDates.length === 0) return;
  const db = openDatabase();

  logger.log(`[Database] Inserting ${calendarDates.length} calendar date exceptions...`);

  try {
    db.execSync('BEGIN TRANSACTION;');

    const statement = db.prepareSync(
      'INSERT OR REPLACE INTO calendar_dates (service_id, date, exception_type) VALUES (?, ?, ?)'
    );

    for (const cd of calendarDates) {
      statement.executeSync([
        cd.serviceId,
        cd.date,
        cd.exceptionType,
      ]);
    }

    statement.finalizeSync();
    db.execSync('COMMIT;');

    logger.log(`[Database] ✅ ${calendarDates.length} calendar date exceptions inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    logger.error('[Database] ❌ Failed to insert calendar dates:', error);
    throw error;
  }
}

/**
 * Get active service IDs for a given date.
 * Uses calendar table (day of week) and calendar_dates (exceptions).
 * Returns a Set of service_ids that are active on the given date.
 * If no calendar data exists, returns null (meaning: don't filter by service).
 */
export function getActiveServiceIds(date: Date): Set<string> | null {
  const db = openDatabase();

  try {
    // Check if calendar table has any data
    const calCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM calendar');
    const calDatesCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM calendar_dates');

    if ((!calCount || calCount.count === 0) && (!calDatesCount || calDatesCount.count === 0)) {
      // No calendar data → don't filter (assume all services active)
      return null;
    }

    const dateStr = formatDateYYYYMMDD(date);
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const dayColumn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];

    const activeServiceIds = new Set<string>();

    // 1. Get services from calendar where the day-of-week flag is 1 and date is within range
    if (calCount && calCount.count > 0) {
      const rows = db.getAllSync<{ service_id: string }>(
        `SELECT service_id FROM calendar
         WHERE ${dayColumn} = 1
         AND start_date <= ?
         AND end_date >= ?`,
        [dateStr, dateStr]
      );
      for (const row of rows) {
        activeServiceIds.add(row.service_id);
      }
    }

    // 2. Apply calendar_dates exceptions
    if (calDatesCount && calDatesCount.count > 0) {
      const exceptions = db.getAllSync<{ service_id: string; exception_type: number }>(
        `SELECT service_id, exception_type FROM calendar_dates WHERE date = ?`,
        [dateStr]
      );
      for (const exc of exceptions) {
        if (exc.exception_type === 1) {
          // Service added for this date
          activeServiceIds.add(exc.service_id);
        } else if (exc.exception_type === 2) {
          // Service removed for this date
          activeServiceIds.delete(exc.service_id);
        }
      }
    }

    logger.log(`[Database] Active services for ${dateStr} (${dayColumn}): ${activeServiceIds.size}`);

    // If calendar data exists but no services match (likely expired dates),
    // return null to skip filtering rather than blocking all routes
    if (activeServiceIds.size === 0) {
      logger.warn(`[Database] Calendar data exists but no active services for ${dateStr} - dates may be expired, skipping calendar filter`);
      return null;
    }

    return activeServiceIds;
  } catch (error) {
    logger.warn('[Database] Failed to get active service IDs, skipping calendar filter:', error);
    return null;
  }
}

/**
 * Format a Date to YYYYMMDD string (for calendar queries)
 */
function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Get all stops
 */
export async function getAllStops(): Promise<Stop[]> {
  const db = openDatabase();

  try {
    const rows = db.getAllSync<any>('SELECT * FROM stops');

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    }));
  } catch (error) {
    logger.error('[Database] ❌ Failed to get all stops:', error);
    throw error;
  }
}

/**
 * Get all routes
 */
export async function getAllRoutes(): Promise<Route[]> {
  const db = openDatabase();

  try {
    const rows = db.getAllSync<any>('SELECT * FROM routes');

    return rows.map((row) => ({
      id: row.id,
      shortName: row.short_name,
      longName: row.long_name,
      type: row.type,
      color: row.color,
      textColor: row.text_color,
    }));
  } catch (error) {
    logger.error('[Database] ❌ Failed to get all routes:', error);
    throw error;
  }
}

/**
 * Get stop by ID
 */
export async function getStopById(id: string): Promise<Stop | null> {
  const db = openDatabase();

  try {
    const row = db.getFirstSync<any>('SELECT * FROM stops WHERE id = ?', [id]);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    };
  } catch (error) {
    logger.error('[Database] ❌ Failed to get stop by ID:', error);
    throw error;
  }
}

/**
 * Get routes that serve a specific stop
 * Also finds routes for stops with the same name at nearby locations (same station, different lines)
 */
export async function getRoutesByStopId(stopId: string, includeBus: boolean = false): Promise<Route[]> {
  const db = openDatabase();

  try {
    // First, get the stop info to find its name and location
    const stop = db.getFirstSync<any>(
      'SELECT name, lat, lon FROM stops WHERE id = ?',
      [stopId]
    );

    if (!stop) {
      logger.warn(`[Database] Stop not found: ${stopId}`);
      return [];
    }

    // Find all stop IDs with the same name within 100m (same station, different lines)
    // This handles cases like Konak which has metro_konak, tram_konak, etc.
    // IMPORTANT: Exclude bus stops when the clicked stop is non-bus to avoid
    // showing 100+ bus route numbers on metro/tram/ferry stop details.
    // When includeBus is true (used by routing engine), include all stops.
    const isBusStop = stopId.startsWith('bus_');
    const excludeBus = !isBusStop && !includeBus;
    const radiusDegrees = 100 / 111000; // ~100 meters in degrees
    const sameStationStops = db.getAllSync<{ id: string }>(
      `SELECT id FROM stops
       WHERE name = ?
       AND lat BETWEEN ? AND ?
       AND lon BETWEEN ? AND ?
       ${excludeBus ? "AND id NOT LIKE 'bus_%'" : ''}`,
      [
        stop.name,
        stop.lat - radiusDegrees,
        stop.lat + radiusDegrees,
        stop.lon - radiusDegrees,
        stop.lon + radiusDegrees,
      ]
    );

    const stopIds = sameStationStops.map(s => s.id);
    logger.log(`[Database] Found ${stopIds.length} stops for station "${stop.name}":`, stopIds);

    // Get all routes serving any of these stops
    const placeholders = stopIds.map(() => '?').join(', ');
    const rows = db.getAllSync<any>(
      `SELECT DISTINCT routes.*
       FROM routes
       JOIN trips ON routes.id = trips.route_id
       JOIN stop_times ON trips.id = stop_times.trip_id
       WHERE stop_times.stop_id IN (${placeholders})`,
      stopIds
    );

    const routes = rows.map((row) => ({
      id: row.id,
      shortName: row.short_name,
      longName: row.long_name,
      type: row.type,
      color: row.color,
      textColor: row.text_color,
    }));

    // Fallback: if no routes found via stop_times, detect type from stop ID prefix
    // Handles stops with incomplete GTFS data (e.g., Metro Narlıdere extension stops 18-24)
    if (routes.length === 0 && stop) {
      // Map stop ID prefix to route type
      const PREFIX_TYPE_MAP: Record<string, number> = {
        'metro_': 1,  // Metro
        'tram_': 0,   // Tram
        'rail_': 2,   // İZBAN
        'ferry_': 4,  // Ferry
      };

      for (const [prefix, routeType] of Object.entries(PREFIX_TYPE_MAP)) {
        if (stopId.startsWith(prefix)) {
          logger.log(`[Database] Prefix fallback: "${stop.name}" (${stopId}) → loading all type=${routeType} routes`);
          const fallbackRows = db.getAllSync<any>(
            `SELECT * FROM routes WHERE type = ?`,
            [routeType]
          );
          if (fallbackRows.length > 0) {
            return fallbackRows.map((row: any) => ({
              id: row.id,
              shortName: row.short_name,
              longName: row.long_name,
              type: row.type,
              color: row.color,
              textColor: row.text_color,
            }));
          }
          break;
        }
      }

      // Additional ferry keyword fallback
      const FERRY_KEYWORDS = ['İSKELE', 'ISKELE', 'VAPUR', 'FERİBOT', 'FERIBOT', 'İZDENİZ', 'IZDENIZ'];
      const upperName = (stop.name || '').toUpperCase();
      if (FERRY_KEYWORDS.some((kw: string) => upperName.includes(kw))) {
        logger.log(`[Database] Ferry fallback: "${stop.name}" has ferry keyword, loading all ferry routes`);
        const ferryRows = db.getAllSync<any>(
          `SELECT * FROM routes WHERE type = 4`
        );
        if (ferryRows.length > 0) {
          return ferryRows.map((row: any) => ({
            id: row.id,
            shortName: row.short_name,
            longName: row.long_name,
            type: row.type,
            color: row.color,
            textColor: row.text_color,
          }));
        }
      }
    }

    return routes;
  } catch (error) {
    logger.error('[Database] ❌ Failed to get routes by stop ID:', error);
    throw error;
  }
}

/**
 * Get routes for multiple stops in a single query (batch operation)
 * Returns a Map of stopId -> Route[]
 * This avoids N+1 query problem when fetching routes for multiple stops
 */
export async function getRoutesByStopIds(stopIds: string[]): Promise<Map<string, Route[]>> {
  const db = openDatabase();
  const result = new Map<string, Route[]>();

  if (stopIds.length === 0) {
    return result;
  }

  try {
    const placeholders = stopIds.map(() => '?').join(', ');

    // Single query to get all routes for all stops
    const rows = db.getAllSync<any>(
      `SELECT DISTINCT
         stop_times.stop_id,
         routes.id,
         routes.short_name,
         routes.long_name,
         routes.type,
         routes.color,
         routes.text_color
       FROM routes
       JOIN trips ON routes.id = trips.route_id
       JOIN stop_times ON trips.id = stop_times.trip_id
       WHERE stop_times.stop_id IN (${placeholders})`,
      stopIds
    );

    // Group results by stop_id
    for (const row of rows) {
      const stopId = row.stop_id;
      if (!result.has(stopId)) {
        result.set(stopId, []);
      }

      // Check if route already added for this stop (avoid duplicates)
      const existingRoutes = result.get(stopId)!;
      if (!existingRoutes.some(r => r.id === row.id)) {
        existingRoutes.push({
          id: row.id,
          shortName: row.short_name,
          longName: row.long_name,
          type: row.type,
          color: row.color,
          textColor: row.text_color,
        });
      }
    }

    logger.log(`[Database] Batch fetched routes for ${stopIds.length} stops in 1 query`);
    return result;
  } catch (error) {
    logger.error('[Database] ❌ Failed to batch get routes:', error);
    throw error;
  }
}

/**
 * Get stop IDs served by a specific transport mode using trip_id prefix
 * During import, trip IDs are prefixed: ferry_, metro_, tram_, rail_, bus_
 * This directly queries stop_times to find stops without relying on complex JOINs
 */
export function getStopIdsByTripPrefix(prefix: string): Set<string> {
  const db = openDatabase();

  try {
    const rows = db.getAllSync<{ stop_id: string }>(
      `SELECT DISTINCT stop_id FROM stop_times WHERE trip_id LIKE ?`,
      [`${prefix}%`]
    );
    const stopIds = new Set(rows.map(r => r.stop_id));
    logger.log(`[Database] Found ${stopIds.size} stops with trip prefix "${prefix}"`);
    return stopIds;
  } catch (error) {
    logger.warn(`[Database] Failed to get stops by prefix "${prefix}":`, error);
    return new Set();
  }
}

/**
 * Get stops within geographic bounds (for map display)
 */
export async function getStopsInBounds(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
): Promise<Stop[]> {
  const db = openDatabase();

  try {
    const rows = db.getAllSync<any>(
      'SELECT * FROM stops WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?',
      [minLat, maxLat, minLon, maxLon]
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    }));
  } catch (error) {
    logger.error('[Database] ❌ Failed to get stops in bounds:', error);
    throw error;
  }
}

/**
 * Find all stops at the same station (for multimodal routing)
 * Uses both name matching AND geographic proximity
 *
 * @param stopName - The stop name to search for
 * @param stopLat - Optional latitude for proximity search
 * @param stopLon - Optional longitude for proximity search
 * @returns Array of all stops at this station
 */
export function getAllStopsWithSameName(stopName: string, stopLat?: number, stopLon?: number): Stop[] {
  const db = openDatabase();

  try {
    const normalizedName = normalizeStopName(stopName);
    const baseName = extractBaseStationName(normalizedName);

    // Use SQL to narrow down candidates first (much faster than loading all stops)
    // Search for stops whose name contains the base name
    const searchPattern = `%${baseName.split(' ')[0]}%`; // Use first word of base name

    const rows = db.getAllSync<any>(
      `SELECT * FROM stops
       WHERE location_type = 0
       AND (LOWER(name) LIKE ? OR LOWER(name) LIKE ?)`,
      [searchPattern, `%${normalizedName.split(' ')[0]}%`]
    );

    // Filter by name match
    const matchingStops = rows.filter((row: any) => {
      const rowNormalized = normalizeStopName(row.name);
      const rowBaseName = extractBaseStationName(rowNormalized);

      // Exact normalized match
      if (rowNormalized === normalizedName) return true;

      // Same base name
      if (baseName === rowBaseName) return true;

      // Base name is contained
      if (rowNormalized.startsWith(baseName + ' ')) return true;
      if (normalizedName.startsWith(rowBaseName + ' ')) return true;

      return false;
    });

    // If we have coordinates, also find nearby stops (within 300m) with ferry/transit keywords
    // This catches ferry stops that might have different names
    if (stopLat && stopLon) {
      const latDelta = 300 / 111000; // ~300m
      const lonDelta = 300 / (111000 * Math.cos((stopLat * Math.PI) / 180));

      const nearbyRows = db.getAllSync<any>(
        `SELECT * FROM stops
         WHERE location_type = 0
         AND lat BETWEEN ? AND ?
         AND lon BETWEEN ? AND ?
         AND (UPPER(name) LIKE '%ISKELE%' OR UPPER(name) LIKE '%VAPUR%'
              OR UPPER(name) LIKE '%GAR%' OR UPPER(name) LIKE '%ISTASYON%')`,
        [stopLat - latDelta, stopLat + latDelta, stopLon - lonDelta, stopLon + lonDelta]
      );

      // Add nearby ferry/transit stops that weren't already matched
      const existingIds = new Set(matchingStops.map((s: any) => s.id));
      for (const row of nearbyRows) {
        if (!existingIds.has(row.id)) {
          matchingStops.push(row);
        }
      }
    }

    logger.log(`[Database] Found ${matchingStops.length} stops matching "${stopName}"`);

    return matchingStops.map((row: any) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    }));
  } catch (error) {
    logger.warn('[Database] Failed to get stops with same name:', error);
    return [];
  }
}

/**
 * Extract the base station name from a full stop name
 * "Konak İskele" → "konak"
 * "Halkapınar Metro" → "halkapinar"
 * "Karşıyaka" → "karsiyaka"
 */
function extractBaseStationName(normalizedName: string): string {
  // Common suffixes that indicate mode/type, not part of the base name
  const MODE_SUFFIXES = [
    'iskele', 'iskelesi', 'metro', 'istasyon', 'istasyonu',
    'gar', 'gari', 'durak', 'duragi', 'tren', 'izban',
    'tramvay', 'otobus', 'vapur', 'feribot'
  ];

  const words = normalizedName.split(/\s+/);

  // Remove trailing mode suffixes
  while (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (MODE_SUFFIXES.includes(lastWord)) {
      words.pop();
    } else {
      break;
    }
  }

  return words.join(' ');
}

/**
 * Normalize stop name for comparison
 * Handles Turkish characters and suffixes like İskele/İskelesi (same station)
 */
export function normalizeStopName(name: string): string {
  let normalized = name
    // Remove accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Turkish special characters that don't decompose with NFD
    .replace(/ı/g, 'i')  // dotless i → i
    .replace(/İ/g, 'i')  // dotted I → i
    .replace(/ş/g, 's')  // s-cedilla
    .replace(/Ş/g, 's')
    .replace(/ğ/g, 'g')  // soft g
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')  // u-umlaut
    .replace(/Ü/g, 'u')
    .replace(/ö/g, 'o')  // o-umlaut
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')  // c-cedilla
    .replace(/Ç/g, 'c')
    .toLowerCase()
    .trim();

  // Turkish suffix normalization: İskelesi → İskele (possessive suffix)
  // "İskelesi" means "the ferry terminal" - same as "İskele"
  normalized = normalized
    .replace(/iskelesi$/i, 'iskele')
    .replace(/istasyonu$/i, 'istasyon')
    .replace(/duragi$/i, 'durak')
    .replace(/gari$/i, 'gar');

  return normalized;
}

/**
 * Search stops by name (case insensitive, accent-insensitive)
 * Optimized: Uses SQL LIKE first to reduce dataset, then filters client-side for accents
 */
export async function searchStops(query: string): Promise<Stop[]> {
  const db = openDatabase();

  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Normalize query for accent-insensitive comparison
    const normalizedQuery = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    // Use SQL LIKE to pre-filter (much faster than loading all rows)
    // This reduces the dataset significantly before client-side accent filtering
    const rows = db.getAllSync<any>(
      `SELECT * FROM stops
       WHERE name LIKE ? COLLATE NOCASE
       OR name LIKE ? COLLATE NOCASE
       LIMIT 200`,
      [`%${query}%`, `%${normalizedQuery}%`]
    );

    // Now do precise accent-insensitive filtering on the smaller set
    const filteredRows = rows.filter((row: any) => {
      const normalizedName = row.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return normalizedName.includes(normalizedQuery);
    });

    // Deduplicate by exact name (case-insensitive)
    // This prevents showing the same stop multiple times (metro_konak, tram_konak both named "Konak")
    // Keep the first occurrence for each unique name
    const seen = new Map<string, any>();
    for (const row of filteredRows) {
      const key = row.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, row);
      }
    }

    // Sort alphabetically by name and limit to 50
    const sortedRows = Array.from(seen.values()).sort((a: any, b: any) =>
      a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
    );
    return sortedRows.slice(0, 50).map((row: any) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    }));
  } catch (error) {
    logger.error('[Database] ❌ Failed to search stops:', error);
    throw error;
  }
}

/**
 * Search routes by name or short name (accent-insensitive)
 * Optimized: Uses SQL LIKE first to reduce dataset
 */
export async function searchRoutes(query: string): Promise<Route[]> {
  const db = openDatabase();

  try {
    if (!query || query.trim().length < 1) {
      return [];
    }

    // Normalize query for accent-insensitive comparison
    const normalizedQuery = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    // Use SQL LIKE to pre-filter (routes table is small, but still faster)
    const rows = db.getAllSync<any>(
      `SELECT * FROM routes
       WHERE short_name LIKE ? COLLATE NOCASE
       OR long_name LIKE ? COLLATE NOCASE
       OR short_name LIKE ? COLLATE NOCASE
       OR long_name LIKE ? COLLATE NOCASE
       LIMIT 100`,
      [`%${query}%`, `%${query}%`, `%${normalizedQuery}%`, `%${normalizedQuery}%`]
    );

    // Now do precise accent-insensitive filtering on the smaller set
    const filteredRows = rows.filter((row: any) => {
      const normalizedShortName = row.short_name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const normalizedLongName = row.long_name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return normalizedShortName.includes(normalizedQuery) ||
             normalizedLongName.includes(normalizedQuery);
    });

    // Sort alphabetically by short name (line number) and limit to 50
    const sortedRows = filteredRows.sort((a: any, b: any) =>
      a.short_name.localeCompare(b.short_name, 'tr', { numeric: true, sensitivity: 'base' })
    );
    return sortedRows.slice(0, 50).map((row: any) => ({
      id: row.id,
      shortName: row.short_name,
      longName: row.long_name,
      type: row.type,
      color: row.color,
      textColor: row.text_color,
    }));
  } catch (error) {
    logger.error('[Database] ❌ Failed to search routes:', error);
    throw error;
  }
}

/**
 * Get route by ID
 */
export async function getRouteById(id: string): Promise<Route | null> {
  const db = openDatabase();

  try {
    const row = db.getFirstSync<any>('SELECT * FROM routes WHERE id = ?', [id]);

    if (!row) return null;

    return {
      id: row.id,
      shortName: row.short_name,
      longName: row.long_name,
      type: row.type,
      color: row.color,
      textColor: row.text_color,
    };
  } catch (error) {
    logger.error('[Database] ❌ Failed to get route by ID:', error);
    throw error;
  }
}

/**
 * Get stops served by a specific route (ordered by stop sequence)
 */
export async function getStopsByRouteId(routeId: string): Promise<Stop[]> {
  const db = openDatabase();

  try {
    const rows = db.getAllSync<any>(
      `SELECT DISTINCT stops.*
       FROM stops
       JOIN stop_times ON stops.id = stop_times.stop_id
       JOIN trips ON stop_times.trip_id = trips.id
       WHERE trips.route_id = ?
       ORDER BY stop_times.stop_sequence`,
      [routeId]
    );

    const stops = rows.map((row) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    }));

    // Fallback: if no stops found via stop_times for a ferry route,
    // return all stops with ferry keywords in their name (İzdeniz GTFS may have broken stop_times)
    if (stops.length === 0) {
      const route = db.getFirstSync<any>('SELECT type FROM routes WHERE id = ?', [routeId]);
      if (route && route.type === 4) {
        logger.log(`[Database] Ferry fallback: no stops via stop_times for route ${routeId}, loading ferry stops by name`);
        const ferryRows = db.getAllSync<any>(
          `SELECT * FROM stops
           WHERE UPPER(name) LIKE '%ISKELE%'
              OR UPPER(name) LIKE '%İSKELE%'
              OR UPPER(name) LIKE '%VAPUR%'
              OR UPPER(name) LIKE '%FERIBOT%'
              OR UPPER(name) LIKE '%FERİBOT%'
              OR UPPER(name) LIKE '%IZDENIZ%'
              OR UPPER(name) LIKE '%İZDENİZ%'`
        );
        return ferryRows.map((row: any) => ({
          id: row.id,
          name: row.name,
          lat: row.lat,
          lon: row.lon,
          locationType: row.location_type,
          parentStation: row.parent_station,
        }));
      }
    }

    return stops;
  } catch (error) {
    logger.error('[Database] ❌ Failed to get stops by route ID:', error);
    throw error;
  }
}

/**
 * Get trip info (headsign) for a route going FROM origin TO destination
 * This ensures we get the correct direction by checking stop sequence
 */
export async function getTripInfoForRoute(
  routeId: string,
  towardStopId: string,
  fromStopId?: string
): Promise<{ headsign: string } | null> {
  const db = openDatabase();

  try {
    // If we have both origin and destination, find a trip where origin comes before destination
    if (fromStopId) {
      const row = db.getFirstSync<any>(
        `SELECT trips.headsign
         FROM trips
         JOIN stop_times st_from ON trips.id = st_from.trip_id AND st_from.stop_id = ?
         JOIN stop_times st_to ON trips.id = st_to.trip_id AND st_to.stop_id = ?
         WHERE trips.route_id = ?
           AND st_from.stop_sequence < st_to.stop_sequence
           AND trips.headsign IS NOT NULL
         LIMIT 1`,
        [fromStopId, towardStopId, routeId]
      );

      if (row?.headsign) {
        return { headsign: row.headsign };
      }
    }

    // Fallback: just find any trip that goes through the destination
    const row = db.getFirstSync<any>(
      `SELECT DISTINCT trips.headsign
       FROM trips
       JOIN stop_times ON trips.id = stop_times.trip_id
       WHERE trips.route_id = ?
         AND stop_times.stop_id = ?
         AND trips.headsign IS NOT NULL
       LIMIT 1`,
      [routeId, towardStopId]
    );

    if (!row || !row.headsign) return null;

    return { headsign: row.headsign };
  } catch (error) {
    logger.error('[Database] ❌ Failed to get trip info:', error);
    return null;
  }
}

/**
 * Departure information for display
 */
export interface TheoreticalDeparture {
  routeShortName: string;
  routeColor: string;
  headsign: string;
  departureTime: Date;
}

/**
 * Find transfer stops between two sets of routes.
 * Uses two fast indexed queries + in-memory matching instead of one massive 5-way JOIN.
 * Matches by: same stop name (multi-modal stations) OR proximity within ~330m (bus near rail).
 *
 * @param fromRouteIds - Route IDs from the departure side
 * @param toRouteIds - Route IDs from the arrival side
 * @param limit - Max number of transfer points to return
 * @returns Array of { stopId, stopName, lat, lon, fromRouteId, toRouteId }
 */
export interface TransferPoint {
  stopId: string;
  stopName: string;
  lat: number;
  lon: number;
  fromRouteId: string;
  toRouteId: string;
  // The to-route's actual stop (may differ from stopId for proximity matches)
  toStopId: string;
  toStopLat: number;
  toStopLon: number;
  walkDistance: number; // meters between the two physical stops
}

export function findTransferStops(
  fromRouteIds: string[],
  toRouteIds: string[],
  limit: number = 10
): TransferPoint[] {
  const db = openDatabase();

  if (fromRouteIds.length === 0 || toRouteIds.length === 0) return [];

  try {
    // Query 1: Get unique (stop, route) pairs for fromRoutes
    const fromPlaceholders = fromRouteIds.map(() => '?').join(', ');
    const fromStops = db.getAllSync<{
      stop_id: string;
      stop_name: string;
      lat: number;
      lon: number;
      route_id: string;
    }>(
      `SELECT s.id AS stop_id, s.name AS stop_name, s.lat, s.lon, t.route_id
       FROM trips t
       JOIN stop_times st ON t.id = st.trip_id
       JOIN stops s ON st.stop_id = s.id
       WHERE t.route_id IN (${fromPlaceholders})
       GROUP BY s.id, t.route_id`,
      fromRouteIds
    );

    // Query 2: Get unique (stop, route) pairs for toRoutes
    const toPlaceholders = toRouteIds.map(() => '?').join(', ');
    const toStops = db.getAllSync<{
      stop_id: string;
      stop_name: string;
      lat: number;
      lon: number;
      route_id: string;
    }>(
      `SELECT s.id AS stop_id, s.name AS stop_name, s.lat, s.lon, t.route_id
       FROM trips t
       JOIN stop_times st ON t.id = st.trip_id
       JOIN stops s ON st.stop_id = s.id
       WHERE t.route_id IN (${toPlaceholders})
       GROUP BY s.id, t.route_id`,
      toRouteIds
    );

    // Build lookup indexes for toStops
    const toByName = new Map<string, typeof toStops>();
    const toByGrid = new Map<string, typeof toStops>();

    for (const ts of toStops) {
      const name = ts.stop_name.toLowerCase().trim();
      if (!toByName.has(name)) toByName.set(name, []);
      toByName.get(name)!.push(ts);

      const gridKey = `${Math.round(ts.lat / 0.003)}_${Math.round(ts.lon / 0.003)}`;
      if (!toByGrid.has(gridKey)) toByGrid.set(gridKey, []);
      toByGrid.get(gridKey)!.push(ts);
    }

    // Haversine helper (inline to avoid circular dep)
    const dist = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Match: find stops served by both a fromRoute and a toRoute
    const results: TransferPoint[] = [];
    const seen = new Set<string>();

    for (const fs of fromStops) {
      if (results.length >= limit) break;

      // 1. Name match (same station name)
      const nameKey = fs.stop_name.toLowerCase().trim();
      const nameMatches = toByName.get(nameKey) || [];
      for (const ts of nameMatches) {
        if (ts.route_id === fs.route_id) continue;
        const dedupKey = `${fs.route_id}-${ts.route_id}-${nameKey}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        const walkDist = dist(fs.lat, fs.lon, ts.lat, ts.lon);
        results.push({
          stopId: fs.stop_id,
          stopName: fs.stop_name,
          lat: fs.lat,
          lon: fs.lon,
          fromRouteId: fs.route_id,
          toRouteId: ts.route_id,
          toStopId: ts.stop_id,
          toStopLat: ts.lat,
          toStopLon: ts.lon,
          walkDistance: Math.round(walkDist),
        });
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;

      // 2. Proximity match (within ~330m via grid cells)
      const baseLat = Math.round(fs.lat / 0.003);
      const baseLon = Math.round(fs.lon / 0.003);
      for (let di = -1; di <= 1 && results.length < limit; di++) {
        for (let dj = -1; dj <= 1 && results.length < limit; dj++) {
          const nearKey = `${baseLat + di}_${baseLon + dj}`;
          const nearStops = toByGrid.get(nearKey);
          if (!nearStops) continue;
          for (const ts of nearStops) {
            if (ts.route_id === fs.route_id) continue;
            if (Math.abs(ts.lat - fs.lat) >= 0.003 || Math.abs(ts.lon - fs.lon) >= 0.003) continue;
            const dedupKey = `${fs.route_id}-${ts.route_id}-${fs.stop_id}`;
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);
            const walkDist = dist(fs.lat, fs.lon, ts.lat, ts.lon);
            results.push({
              stopId: fs.stop_id,
              stopName: fs.stop_name,
              lat: fs.lat,
              lon: fs.lon,
              fromRouteId: fs.route_id,
              toRouteId: ts.route_id,
              toStopId: ts.stop_id,
              toStopLat: ts.lat,
              toStopLon: ts.lon,
              walkDistance: Math.round(walkDist),
            });
            if (results.length >= limit) break;
          }
        }
      }
    }

    return results;
  } catch (error) {
    logger.warn('[Database] Failed to find transfer stops:', error);
    return [];
  }
}

/**
 * Find the next real departure from stop_times for a given route between two stops.
 * Returns the actual departure time from the origin stop and arrival at the destination,
 * based on GTFS stop_times data.
 *
 * @param routeId - The route ID
 * @param fromStopId - Origin stop ID
 * @param toStopId - Destination stop ID
 * @param afterTime - Earliest departure time (HH:MM:SS format)
 * @param activeServiceIds - Set of active service IDs (null = no filter)
 * @returns Departure and arrival times in minutes since midnight, or null if not found
 */
export function findNextDepartureOnRoute(
  routeId: string,
  fromStopId: string,
  toStopId: string,
  afterTime: string,
  activeServiceIds: Set<string> | null
): { departureMinutes: number; arrivalMinutes: number; tripId: string } | null {
  const db = openDatabase();

  try {
    // Build service filter clause
    let serviceFilter = '';
    const params: any[] = [routeId, fromStopId, toStopId, afterTime];

    if (activeServiceIds !== null && activeServiceIds.size > 0) {
      const serviceList = Array.from(activeServiceIds);
      const placeholders = serviceList.map(() => '?').join(', ');
      serviceFilter = `AND trips.service_id IN (${placeholders})`;
      params.push(...serviceList);
    }

    // Find a trip on this route where:
    // 1. It stops at fromStopId before toStopId (sequence check)
    // 2. Departure from fromStopId is after the requested time
    const row = db.getFirstSync<{
      from_departure: string;
      to_arrival: string;
      trip_id: string;
    }>(
      `SELECT
         st_from.departure_time AS from_departure,
         st_to.arrival_time AS to_arrival,
         trips.id AS trip_id
       FROM trips
       JOIN stop_times st_from ON trips.id = st_from.trip_id AND st_from.stop_id = ?
       JOIN stop_times st_to ON trips.id = st_to.trip_id AND st_to.stop_id = ?
       WHERE trips.route_id = ?
         AND st_from.stop_sequence < st_to.stop_sequence
         AND st_from.departure_time >= ?
         ${serviceFilter}
       ORDER BY st_from.departure_time ASC
       LIMIT 1`,
      [fromStopId, toStopId, routeId, afterTime, ...(activeServiceIds !== null && activeServiceIds.size > 0 ? Array.from(activeServiceIds) : [])]
    );

    if (!row) return null;

    return {
      departureMinutes: parseTimeToMinutes(row.from_departure),
      arrivalMinutes: parseTimeToMinutes(row.to_arrival),
      tripId: row.trip_id,
    };
  } catch (error) {
    logger.warn('[Database] Failed to find next departure on route:', error);
    return null;
  }
}

/**
 * Find actual travel time between two stops on a route using stop_times data.
 * Returns the median travel time in minutes across all trips on this route.
 * Falls back to null if no data found.
 */
export function getActualTravelTime(
  routeId: string,
  fromStopId: string,
  toStopId: string
): number | null {
  const db = openDatabase();

  try {
    // Get travel times from all trips on this route between these two stops
    const rows = db.getAllSync<{ from_dep: string; to_arr: string }>(
      `SELECT
         st_from.departure_time AS from_dep,
         st_to.arrival_time AS to_arr
       FROM trips
       JOIN stop_times st_from ON trips.id = st_from.trip_id AND st_from.stop_id = ?
       JOIN stop_times st_to ON trips.id = st_to.trip_id AND st_to.stop_id = ?
       WHERE trips.route_id = ?
         AND st_from.stop_sequence < st_to.stop_sequence
       LIMIT 10`,
      [fromStopId, toStopId, routeId]
    );

    if (rows.length === 0) return null;

    // Calculate median travel time
    const travelTimes = rows.map(r => {
      const dep = parseTimeToMinutes(r.from_dep);
      const arr = parseTimeToMinutes(r.to_arr);
      return arr - dep;
    }).filter(t => t > 0 && t < 180); // Sanity check: 0 < duration < 3 hours

    if (travelTimes.length === 0) return null;

    travelTimes.sort((a, b) => a - b);
    const median = travelTimes[Math.floor(travelTimes.length / 2)];
    return Math.round(median);
  } catch (error) {
    logger.warn('[Database] Failed to get actual travel time:', error);
    return null;
  }
}

/**
 * Parse GTFS time string (HH:MM:SS) to minutes since midnight.
 * Handles times > 24:00:00 (GTFS convention for trips past midnight).
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
}

/**
 * Check if a route has any trips departing from a stop around a given time.
 * Returns the next departure time in minutes since midnight, or null if no service.
 * Also filters by active service IDs if provided.
 *
 * @param routeId - The route ID to check
 * @param stopId - The stop ID to check departures from
 * @param timeMinutes - Target time in minutes since midnight
 * @param activeServiceIds - Set of active service IDs (or null to skip filter)
 * @param windowMinutes - Time window to search (default 60 minutes for night buses)
 * @returns Next departure time in minutes, or null if no service
 */
export function getNextDepartureForRoute(
  routeId: string,
  stopId: string,
  timeMinutes: number,
  activeServiceIds: Set<string> | null,
  windowMinutes: number = 60
): number | null {
  const db = openDatabase();

  try {
    const minTime = timeMinutes;
    const maxTime = timeMinutes + windowMinutes;

    // Format times as HH:MM:SS for comparison
    const minTimeStr = `${Math.floor(minTime / 60).toString().padStart(2, '0')}:${(minTime % 60).toString().padStart(2, '0')}:00`;
    const maxTimeStr = `${Math.floor(maxTime / 60).toString().padStart(2, '0')}:${(maxTime % 60).toString().padStart(2, '0')}:00`;

    let row: { departure_time: string } | null;

    if (activeServiceIds !== null && activeServiceIds.size > 0) {
      const serviceList = Array.from(activeServiceIds);
      const placeholders = serviceList.map(() => '?').join(', ');

      row = db.getFirstSync<{ departure_time: string }>(
        `SELECT st.departure_time
         FROM stop_times st
         JOIN trips t ON st.trip_id = t.id
         WHERE t.route_id = ?
           AND st.stop_id = ?
           AND st.departure_time >= ?
           AND st.departure_time <= ?
           AND t.service_id IN (${placeholders})
         ORDER BY st.departure_time
         LIMIT 1`,
        [routeId, stopId, minTimeStr, maxTimeStr, ...serviceList]
      );
    } else {
      row = db.getFirstSync<{ departure_time: string }>(
        `SELECT st.departure_time
         FROM stop_times st
         JOIN trips t ON st.trip_id = t.id
         WHERE t.route_id = ?
           AND st.stop_id = ?
           AND st.departure_time >= ?
           AND st.departure_time <= ?
         ORDER BY st.departure_time
         LIMIT 1`,
        [routeId, stopId, minTimeStr, maxTimeStr]
      );
    }

    if (!row) return null;
    return parseTimeToMinutes(row.departure_time);
  } catch (error) {
    logger.warn('[Database] Failed to get next departure for route:', error);
    return null;
  }
}

/**
 * Get next theoretical departures for a stop
 * Returns upcoming departures sorted by time
 * Filters by active service IDs when calendar data is available
 */
export async function getNextDepartures(stopId: string, limit: number = 20): Promise<TheoreticalDeparture[]> {
  const db = openDatabase();

  try {
    // Get current time in HH:MM:SS format
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    // Get active service IDs for today (if calendar data exists)
    const activeServices = getActiveServiceIds(now);

    let rows: any[];

    if (activeServices !== null && activeServices.size > 0) {
      // Calendar data available → filter by active services
      const serviceList = Array.from(activeServices);
      const placeholders = serviceList.map(() => '?').join(', ');

      rows = db.getAllSync<any>(
        `SELECT
           routes.short_name,
           routes.color,
           trips.headsign,
           stop_times.departure_time
         FROM stop_times
         JOIN trips ON stop_times.trip_id = trips.id
         JOIN routes ON trips.route_id = routes.id
         WHERE stop_times.stop_id = ?
           AND stop_times.departure_time >= ?
           AND trips.service_id IN (${placeholders})
         GROUP BY stop_times.departure_time, routes.id, trips.headsign
         ORDER BY stop_times.departure_time
         LIMIT ?`,
        [stopId, currentTime, ...serviceList, limit]
      );
    } else {
      // No calendar data → show all departures (existing behavior)
      rows = db.getAllSync<any>(
        `SELECT
           routes.short_name,
           routes.color,
           trips.headsign,
           stop_times.departure_time
         FROM stop_times
         JOIN trips ON stop_times.trip_id = trips.id
         JOIN routes ON trips.route_id = routes.id
         WHERE stop_times.stop_id = ?
           AND stop_times.departure_time >= ?
         GROUP BY stop_times.departure_time, routes.id, trips.headsign
         ORDER BY stop_times.departure_time
         LIMIT ?`,
        [stopId, currentTime, limit]
      );
    }

    // Convert to Date objects and return
    return rows.map((row) => {
      // Parse HH:MM:SS to Date (today's date with this time)
      const [hours, minutes, seconds] = row.departure_time.split(':').map(Number);
      const departureDate = new Date();
      departureDate.setHours(hours, minutes, seconds || 0, 0);

      return {
        routeShortName: row.short_name,
        routeColor: row.color,
        headsign: row.headsign || '—',
        departureTime: departureDate,
      };
    });
  } catch (error) {
    logger.error('[Database] ❌ Failed to get next departures:', error);
    throw error;
  }
}
