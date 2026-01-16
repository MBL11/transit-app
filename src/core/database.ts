/**
 * SQLite database for storing GTFS data locally
 * Uses expo-sqlite for React Native
 */

import * as SQLite from 'expo-sqlite';
import type { Stop, Route, Trip, StopTime } from './types/models';

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

  console.log('[Database] Initializing database...');

  try {
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
    console.log('[Database] Creating indexes...');

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

    console.log('[Database] ✅ Database initialized successfully');
  } catch (error) {
    console.error('[Database] ❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Drop all tables (for testing/reset)
 */
export async function dropAllTables(): Promise<void> {
  const db = openDatabase();

  console.log('[Database] Dropping all tables...');

  try {
    db.execSync('DROP TABLE IF EXISTS shapes;');
    db.execSync('DROP TABLE IF EXISTS stop_times;');
    db.execSync('DROP TABLE IF EXISTS trips;');
    db.execSync('DROP TABLE IF EXISTS routes;');
    db.execSync('DROP TABLE IF EXISTS stops;');

    console.log('[Database] ✅ All tables dropped');
  } catch (error) {
    console.error('[Database] ❌ Failed to drop tables:', error);
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

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Insert stops in batch with transaction
 */
export async function insertStops(stops: Stop[]): Promise<void> {
  const db = openDatabase();

  console.log(`[Database] Inserting ${stops.length} stops...`);

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

    console.log(`[Database] ✅ ${stops.length} stops inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    console.error('[Database] ❌ Failed to insert stops:', error);
    throw error;
  }
}

/**
 * Insert routes in batch with transaction
 */
export async function insertRoutes(routes: Route[]): Promise<void> {
  const db = openDatabase();

  console.log(`[Database] Inserting ${routes.length} routes...`);

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

    console.log(`[Database] ✅ ${routes.length} routes inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    console.error('[Database] ❌ Failed to insert routes:', error);
    throw error;
  }
}

/**
 * Insert trips in batch with transaction
 */
export async function insertTrips(trips: Trip[]): Promise<void> {
  const db = openDatabase();

  console.log(`[Database] Inserting ${trips.length} trips...`);

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

    console.log(`[Database] ✅ ${trips.length} trips inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    console.error('[Database] ❌ Failed to insert trips:', error);
    throw error;
  }
}

/**
 * Insert stop times in batch with transaction
 */
export async function insertStopTimes(stopTimes: StopTime[]): Promise<void> {
  const db = openDatabase();

  console.log(`[Database] Inserting ${stopTimes.length} stop times...`);

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

    console.log(`[Database] ✅ ${stopTimes.length} stop times inserted`);
  } catch (error) {
    db.execSync('ROLLBACK;');
    console.error('[Database] ❌ Failed to insert stop times:', error);
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
    console.error('[Database] ❌ Failed to get all stops:', error);
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
    console.error('[Database] ❌ Failed to get stop by ID:', error);
    throw error;
  }
}

/**
 * Get routes that serve a specific stop
 */
export async function getRoutesByStopId(stopId: string): Promise<Route[]> {
  const db = openDatabase();

  try {
    const rows = db.getAllSync<any>(
      `SELECT DISTINCT routes.*
       FROM routes
       JOIN trips ON routes.id = trips.route_id
       JOIN stop_times ON trips.id = stop_times.trip_id
       WHERE stop_times.stop_id = ?`,
      [stopId]
    );

    return rows.map((row) => ({
      id: row.id,
      shortName: row.short_name,
      longName: row.long_name,
      type: row.type,
      color: row.color,
      textColor: row.text_color,
    }));
  } catch (error) {
    console.error('[Database] ❌ Failed to get routes by stop ID:', error);
    throw error;
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
    console.error('[Database] ❌ Failed to get stops in bounds:', error);
    throw error;
  }
}

/**
 * Search stops by name (case insensitive)
 */
export async function searchStops(query: string): Promise<Stop[]> {
  const db = openDatabase();

  try {
    // Get all stops and filter client-side for accent-insensitive search
    const rows = db.getAllSync<any>('SELECT * FROM stops');

    // Normalize query for accent-insensitive comparison
    const normalizedQuery = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const filteredRows = rows.filter((row: any) => {
      const normalizedName = row.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return normalizedName.includes(normalizedQuery);
    });

    // Limit results to 50
    return filteredRows.slice(0, 50).map((row: any) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    }));
  } catch (error) {
    console.error('[Database] ❌ Failed to search stops:', error);
    throw error;
  }
}

/**
 * Search routes by name or short name (accent-insensitive)
 */
export async function searchRoutes(query: string): Promise<Route[]> {
  const db = openDatabase();

  try {
    // Get all routes and filter client-side for accent-insensitive search
    const rows = db.getAllSync<any>('SELECT * FROM routes');

    // Normalize query for accent-insensitive comparison
    const normalizedQuery = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

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

    // Limit results to 50
    return filteredRows.slice(0, 50).map((row: any) => ({
      id: row.id,
      shortName: row.short_name,
      longName: row.long_name,
      type: row.type,
      color: row.color,
      textColor: row.text_color,
    }));
  } catch (error) {
    console.error('[Database] ❌ Failed to search routes:', error);
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
    console.error('[Database] ❌ Failed to get route by ID:', error);
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

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      locationType: row.location_type,
      parentStation: row.parent_station,
    }));
  } catch (error) {
    console.error('[Database] ❌ Failed to get stops by route ID:', error);
    throw error;
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
    console.error('[Database] ❌ Failed to get next departures:', error);
    throw error;
  }
}
