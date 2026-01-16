/**
 * Paris Transit Adapter
 * Implements the TransitAdapter interface for Paris/IDFM
 */

import type {
  TransitAdapter,
  AdapterConfig,
  NextDeparture,
  Alert,
  DataSource,
} from '../../core/types/adapter';
import type { Stop, Route, Trip, StopTime } from '../../core/types/models';
import * as db from '../../core/database';
import { parisConfig, parisDataSource } from './config';
import { runMigrations } from '../../core/database-migration';

/**
 * Paris adapter implementation
 * Currently loads data from the local SQLite database
 * TODO: Add GTFS download and import functionality
 */
export class ParisAdapter implements TransitAdapter {
  private lastUpdateTime: Date;

  constructor() {
    this.lastUpdateTime = new Date();
  }

  /**
   * Get adapter configuration
   */
  get config(): AdapterConfig {
    return parisConfig;
  }

  /**
   * Load all stops from database
   */
  async loadStops(): Promise<Stop[]> {
    console.log('[ParisAdapter] Loading stops...');
    try {
      const stops = await db.getAllStops();
      console.log(`[ParisAdapter] ✅ Loaded ${stops.length} stops`);
      return stops;
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to load stops:', error);
      throw new Error('Failed to load stops');
    }
  }

  /**
   * Load all routes from database
   */
  async loadRoutes(): Promise<Route[]> {
    console.log('[ParisAdapter] Loading routes...');
    try {
      const database = db.openDatabase();
      const rows = database.getAllSync<any>('SELECT * FROM routes');

      const routes: Route[] = rows.map((row) => ({
        id: row.id,
        shortName: row.short_name,
        longName: row.long_name,
        type: row.type,
        color: row.color,
        textColor: row.text_color,
      }));

      console.log(`[ParisAdapter] ✅ Loaded ${routes.length} routes`);
      return routes;
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to load routes:', error);
      throw new Error('Failed to load routes');
    }
  }

  /**
   * Load all trips from database
   */
  async loadTrips(): Promise<Trip[]> {
    console.log('[ParisAdapter] Loading trips...');
    try {
      const database = db.openDatabase();
      const rows = database.getAllSync<any>('SELECT * FROM trips');

      const trips: Trip[] = rows.map((row) => ({
        id: row.id,
        routeId: row.route_id,
        serviceId: row.service_id,
        headsign: row.headsign,
        directionId: row.direction_id,
        shapeId: row.shape_id,
      }));

      console.log(`[ParisAdapter] ✅ Loaded ${trips.length} trips`);
      return trips;
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to load trips:', error);
      throw new Error('Failed to load trips');
    }
  }

  /**
   * Load all stop times from database
   */
  async loadStopTimes(): Promise<StopTime[]> {
    console.log('[ParisAdapter] Loading stop times...');
    try {
      const database = db.openDatabase();
      const rows = database.getAllSync<any>('SELECT * FROM stop_times LIMIT 10000');

      const stopTimes: StopTime[] = rows.map((row) => ({
        tripId: row.trip_id,
        arrivalTime: row.arrival_time,
        departureTime: row.departure_time,
        stopId: row.stop_id,
        stopSequence: row.stop_sequence,
      }));

      console.log(`[ParisAdapter] ✅ Loaded ${stopTimes.length} stop times`);
      return stopTimes;
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to load stop times:', error);
      throw new Error('Failed to load stop times');
    }
  }

  /**
   * Load shapes from database (optional)
   */
  async loadShapes(): Promise<any[]> {
    console.log('[ParisAdapter] Loading shapes...');
    try {
      const database = db.openDatabase();
      const rows = database.getAllSync<any>('SELECT * FROM shapes LIMIT 5000');
      console.log(`[ParisAdapter] ✅ Loaded ${rows.length} shape points`);
      return rows;
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to load shapes:', error);
      return [];
    }
  }

  /**
   * Get next departures for a stop (real-time)
   * TODO: Implement SIRI-Lite API integration (Step 10)
   * For now, returns static schedule data
   */
  async getNextDepartures(stopId: string): Promise<NextDeparture[]> {
    console.log(`[ParisAdapter] Getting next departures for stop ${stopId}...`);

    try {
      const database = db.openDatabase();

      // Get current time in HH:MM:SS format
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];

      // Query next departures from stop_times
      const rows = database.getAllSync<any>(
        `SELECT
          st.trip_id,
          st.departure_time,
          t.headsign,
          r.id as route_id,
          r.short_name as route_short_name
         FROM stop_times st
         JOIN trips t ON st.trip_id = t.id
         JOIN routes r ON t.route_id = r.id
         WHERE st.stop_id = ?
           AND st.departure_time >= ?
         ORDER BY st.departure_time
         LIMIT 10`,
        [stopId, currentTime]
      );

      const departures: NextDeparture[] = rows.map((row) => {
        // Parse time string "HH:MM:SS"
        const [hours, minutes, seconds] = row.departure_time.split(':').map(Number);
        const departureDate = new Date();
        departureDate.setHours(hours, minutes, seconds, 0);

        return {
          tripId: row.trip_id,
          routeId: row.route_id,
          routeShortName: row.route_short_name,
          headsign: row.headsign || 'Unknown',
          departureTime: departureDate,
          scheduledTime: departureDate,
          isRealtime: false, // Static schedule for now
          delay: 0,
        };
      });

      console.log(`[ParisAdapter] ✅ Found ${departures.length} next departures`);
      return departures;
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to get next departures:', error);
      return [];
    }
  }

  /**
   * Get service alerts
   * TODO: Implement alerts API (Step 13)
   * For now, returns empty array
   */
  async getAlerts(): Promise<Alert[]> {
    console.log('[ParisAdapter] Getting alerts...');
    // TODO: Implement IDFM alerts API
    return [];
  }

  /**
   * Get data source information
   */
  getDataSource(): DataSource {
    return parisDataSource;
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate(): Date {
    return this.lastUpdateTime;
  }

  /**
   * Initialize adapter - ensure database is set up
   */
  async initialize(): Promise<void> {
    console.log('[ParisAdapter] Initializing adapter...');
    try {
      await db.initializeDatabase();

      // Check if database has data
      const isEmpty = db.isDatabaseEmpty();
      if (isEmpty) {
        console.warn('[ParisAdapter] ⚠️ Database is empty - need to import GTFS data');
        // TODO: Add automatic GTFS download and import
      } else {
        const stats = db.getDatabaseStats();
        console.log('[ParisAdapter] ✅ Database initialized with data:', stats);

        // Run database migrations (e.g., fix route colors)
        const database = db.openDatabase();
        await runMigrations(database);
      }

      this.lastUpdateTime = new Date();
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to initialize:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of Paris adapter
 */
export const parisAdapter = new ParisAdapter();
