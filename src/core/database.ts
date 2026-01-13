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
