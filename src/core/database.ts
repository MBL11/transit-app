/**
 * SQLite database for storing GTFS data locally
 * Uses expo-sqlite for React Native
 */

import * as SQLite from 'expo-sqlite';
import type { Stop, Route, Trip, StopTime } from './types/models';
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

    // Deduplicate by name: same physical stop exists with different prefixes (metro_1, tram_1, etc.)
    // Keep the first occurrence for each unique normalized name
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
 * Get next theoretical departures for a stop
 * Returns upcoming departures sorted by time
 */
export async function getNextDepartures(stopId: string, limit: number = 20): Promise<TheoreticalDeparture[]> {
  const db = openDatabase();

  try {
    // Get current time in HH:MM:SS format
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    const rows = db.getAllSync<any>(
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

    // Convert to Date objects and return
    return rows.map((row) => {
      // Parse HH:MM:SS to Date (today's date with this time)
      const [hours, minutes, seconds] = row.departure_time.split(':').map(Number);
      const departureDate = new Date();
      departureDate.setHours(hours, minutes, seconds || 0, 0);

      return {
        routeShortName: row.short_name,
        routeColor: row.color,
        headsign: row.headsign || 'Direction inconnue',
        departureTime: departureDate,
      };
    });
  } catch (error) {
    logger.error('[Database] ❌ Failed to get next departures:', error);
    throw error;
  }
}
