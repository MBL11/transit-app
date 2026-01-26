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
import { fetchNextDepartures } from './siri-client';
import { GTFSTimeSchema, parseGTFSTime, parseGTFSColor } from '../../core/validation/gtfs-schemas';

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
   * Get next departures for a stop (real-time with SIRI fallback)
   * Filters out terminus arrivals (trains ending their journey at this stop)
   */
  async getNextDepartures(stopId: string): Promise<NextDeparture[]> {
    console.log(`[ParisAdapter] Getting next departures for stop ${stopId}...`);

    // Get stop info to check for terminus filtering
    const database = db.openDatabase();
    const stop = database.getFirstSync<{ name: string }>(
      'SELECT name FROM stops WHERE id = ?',
      [stopId]
    );
    const stopName = stop?.name?.toLowerCase() || '';

    try {
      // Try to fetch real-time data from SIRI-Lite
      const realtime = await fetchNextDepartures(stopId);
      if (realtime.length > 0) {
        console.log(`[ParisAdapter] ✅ Found ${realtime.length} real-time departures from SIRI`);

        // Filter out trains arriving at their final destination (terminus)
        const filtered = realtime.filter((dep) => {
          // If the headsign matches the current station, it's arriving at terminus
          if (dep.headsign && stopName.includes(dep.headsign.toLowerCase())) {
            console.log(`[ParisAdapter] Filtering out SIRI terminus: ${dep.routeShortName} → ${dep.headsign}`);
            return false;
          }
          return true;
        });

        console.log(`[ParisAdapter] After terminus filter: ${filtered.length} departures`);
        return filtered;
      }
    } catch (error) {
      console.warn('[ParisAdapter] ⚠️ SIRI fetch failed, falling back to theoretical:', error);
    }

    // Fallback to theoretical schedule
    return this.getTheoreticalDepartures(stopId);
  }

  /**
   * Get theoretical departures from static GTFS schedule
   * Also gets departures from all stops with the same name at the same location
   */
  private async getTheoreticalDepartures(stopId: string): Promise<NextDeparture[]> {
    console.log(`[ParisAdapter] Getting theoretical departures for stop ${stopId}...`);

    try {
      const database = db.openDatabase();

      // First, get the stop info to find its name and location
      const stop = database.getFirstSync<any>(
        'SELECT name, lat, lon FROM stops WHERE id = ?',
        [stopId]
      );

      if (!stop) {
        console.warn(`[ParisAdapter] Stop not found: ${stopId}`);
        return [];
      }

      // Find all stop IDs with the same name within 100m (same station, different lines)
      const radiusDegrees = 100 / 111000; // ~100 meters in degrees
      const sameStationStops = database.getAllSync<{ id: string }>(
        `SELECT id FROM stops
         WHERE name = ?
         AND lat BETWEEN ? AND ?
         AND lon BETWEEN ? AND ?`,
        [
          stop.name,
          stop.lat - radiusDegrees,
          stop.lat + radiusDegrees,
          stop.lon - radiusDegrees,
          stop.lon + radiusDegrees,
        ]
      );

      const stopIds = sameStationStops.map(s => s.id);
      console.log(`[ParisAdapter] Found ${stopIds.length} stops for station "${stop.name}"`);

      // Get current time in HH:MM:SS format
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];

      // Query next departures from stop_times for all stops at this station
      // Also get max_sequence to filter out terminus stops (trains arriving at final destination)
      const placeholders = stopIds.map(() => '?').join(', ');
      const rows = database.getAllSync<any>(
        `SELECT
          st.trip_id,
          st.departure_time,
          st.stop_sequence,
          t.headsign,
          r.id as route_id,
          r.short_name as route_short_name,
          r.color as route_color,
          (SELECT MAX(st2.stop_sequence) FROM stop_times st2 WHERE st2.trip_id = st.trip_id) as max_sequence
         FROM stop_times st
         JOIN trips t ON st.trip_id = t.id
         JOIN routes r ON t.route_id = r.id
         WHERE st.stop_id IN (${placeholders})
           AND st.departure_time >= ?
         ORDER BY st.departure_time
         LIMIT 50`,
        [...stopIds, currentTime]
      );

      // Filter out terminus stops (where the train ends its journey)
      const filteredRows = rows.filter((row) => {
        // If this stop is the last in the trip, it's a terminus - filter it out
        if (row.stop_sequence === row.max_sequence) {
          console.log(`[ParisAdapter] Filtering out terminus arrival: ${row.route_short_name} → ${row.headsign} (stop ${row.stop_sequence}/${row.max_sequence})`);
          return false;
        }
        // Also filter if headsign matches the station name (arriving at final destination)
        if (row.headsign && stop.name.toLowerCase().includes(row.headsign.toLowerCase())) {
          console.log(`[ParisAdapter] Filtering out: headsign "${row.headsign}" matches station "${stop.name}"`);
          return false;
        }
        return true;
      }).slice(0, 30); // Limit to 30 after filtering

      const departures: NextDeparture[] = filteredRows
        .map((row) => {
          // Validate time format
          const timeValidation = GTFSTimeSchema.safeParse(row.departure_time);
          if (!timeValidation.success) {
            console.warn(
              `[ParisAdapter] Invalid departure_time format: ${row.departure_time} for trip ${row.trip_id}`
            );
            return null;
          }

          // Parse time string "HH:MM:SS" with validation
          const timeParts = row.departure_time.split(':');
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          const seconds = parseInt(timeParts[2], 10);

          // Check for NaN after parsing
          if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            console.warn(
              `[ParisAdapter] Invalid time values: ${row.departure_time} for trip ${row.trip_id}`
            );
            return null;
          }

          const departureDate = new Date();
          departureDate.setHours(hours % 24, minutes, seconds, 0);

          // Handle next-day trips (hours >= 24)
          if (hours >= 24) {
            departureDate.setDate(departureDate.getDate() + 1);
          }

          // Validate and parse color
          const routeColor = parseGTFSColor(row.route_color);

          return {
            tripId: row.trip_id,
            routeId: row.route_id,
            routeShortName: row.route_short_name,
            routeColor,
            headsign: row.headsign || 'Unknown',
            departureTime: departureDate,
            scheduledTime: departureDate,
            isRealtime: false, // Static schedule
            delay: 0,
          };
        })
        .filter((dep): dep is NextDeparture => dep !== null);

      console.log(`[ParisAdapter] ✅ Found ${departures.length} theoretical departures`);
      return departures;
    } catch (error) {
      console.error('[ParisAdapter] ❌ Failed to get theoretical departures:', error);
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
