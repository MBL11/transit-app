/**
 * İzmir Transit Adapter
 * Implements the TransitAdapter interface for İzmir/ESHOT
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
import { izmirConfig, izmirDataSource } from './config';
import { runMigrations } from '../../core/database-migration';
import { getLineColor, formatTime } from './utils';
import { logger } from '../../utils/logger';

/**
 * İzmir adapter implementation
 * Loads data from the local SQLite database (Metro, Tramway, İzBAN, ESHOT)
 */
export class IzmirAdapter implements TransitAdapter {
  private lastUpdateTime: Date;

  constructor() {
    this.lastUpdateTime = new Date();
  }

  /**
   * Get adapter configuration
   */
  get config(): AdapterConfig {
    return izmirConfig;
  }

  /**
   * Load all stops from database
   */
  async loadStops(): Promise<Stop[]> {
    logger.log('[IzmirAdapter] Loading stops...');
    try {
      const stops = await db.getAllStops();
      logger.log(`[IzmirAdapter] Loaded ${stops.length} stops`);
      return stops;
    } catch (error) {
      logger.error('[IzmirAdapter] Failed to load stops:', error);
      throw new Error('Failed to load stops');
    }
  }

  /**
   * Load all routes from database
   */
  async loadRoutes(): Promise<Route[]> {
    logger.log('[IzmirAdapter] Loading routes...');
    try {
      const database = db.openDatabase();
      const rows = database.getAllSync<any>('SELECT * FROM routes');

      const routes: Route[] = rows.map((row) => ({
        id: row.id,
        shortName: row.short_name,
        longName: row.long_name,
        type: row.type,
        color: row.color || getLineColor(row.short_name, row.type),
        textColor: row.text_color || '#FFFFFF',
      }));

      logger.log(`[IzmirAdapter] Loaded ${routes.length} routes`);
      return routes;
    } catch (error) {
      logger.error('[IzmirAdapter] Failed to load routes:', error);
      throw new Error('Failed to load routes');
    }
  }

  /**
   * Load all trips from database
   */
  async loadTrips(): Promise<Trip[]> {
    logger.log('[IzmirAdapter] Loading trips...');
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

      logger.log(`[IzmirAdapter] Loaded ${trips.length} trips`);
      return trips;
    } catch (error) {
      logger.error('[IzmirAdapter] Failed to load trips:', error);
      throw new Error('Failed to load trips');
    }
  }

  /**
   * Load all stop times from database
   */
  async loadStopTimes(): Promise<StopTime[]> {
    logger.log('[IzmirAdapter] Loading stop times...');
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

      logger.log(`[IzmirAdapter] Loaded ${stopTimes.length} stop times`);
      return stopTimes;
    } catch (error) {
      logger.error('[IzmirAdapter] Failed to load stop times:', error);
      throw new Error('Failed to load stop times');
    }
  }

  /**
   * Load shapes from database (optional)
   */
  async loadShapes(): Promise<any[]> {
    logger.log('[IzmirAdapter] Loading shapes...');
    try {
      const database = db.openDatabase();
      const rows = database.getAllSync<any>('SELECT * FROM shapes LIMIT 5000');
      logger.log(`[IzmirAdapter] Loaded ${rows.length} shape points`);
      return rows;
    } catch (error) {
      logger.error('[IzmirAdapter] Failed to load shapes:', error);
      return [];
    }
  }

  /**
   * Get next departures for a stop (theoretical schedule)
   * Note: İzmir doesn't have a public real-time API
   */
  async getNextDepartures(stopId: string): Promise<NextDeparture[]> {
    logger.log(`[IzmirAdapter] Getting next departures for stop ${stopId}...`);
    return this.getTheoreticalDepartures(stopId);
  }

  /**
   * Get theoretical departures from static GTFS schedule
   */
  private async getTheoreticalDepartures(stopId: string): Promise<NextDeparture[]> {
    try {
      const database = db.openDatabase();

      // Get current time in HH:MM:SS format
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];

      // Query next departures, deduplicated by (departure_time, route, headsign)
      // Multiple trips can share the same time/route/direction (different service days),
      // so we GROUP BY to show each unique departure only once.
      const rows = database.getAllSync<any>(
        `SELECT
          MIN(st.trip_id) as trip_id,
          st.departure_time,
          t.headsign,
          r.id as route_id,
          r.short_name as route_short_name,
          r.color as route_color,
          r.type as route_type
         FROM stop_times st
         JOIN trips t ON st.trip_id = t.id
         JOIN routes r ON t.route_id = r.id
         WHERE st.stop_id = ?
           AND st.departure_time >= ?
         GROUP BY st.departure_time, r.id, t.headsign
         ORDER BY st.departure_time
         LIMIT 10`,
        [stopId, currentTime]
      );

      const departures: NextDeparture[] = rows
        .map((row) => {
          // Parse time string "HH:MM:SS"
          const timeParts = row.departure_time.split(':');
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          const seconds = parseInt(timeParts[2] || '0', 10);

          if (isNaN(hours) || isNaN(minutes)) {
            logger.warn(`[IzmirAdapter] Invalid time: ${row.departure_time}`);
            return null;
          }

          const departureDate = new Date();
          departureDate.setHours(hours % 24, minutes, seconds, 0);

          // Handle next-day trips (hours >= 24)
          if (hours >= 24) {
            departureDate.setDate(departureDate.getDate() + 1);
          }

          // Use official colors or default
          const routeColor = row.route_color || getLineColor(row.route_short_name, row.route_type);

          return {
            tripId: row.trip_id,
            routeId: row.route_id,
            routeShortName: row.route_short_name || row.route_id || 'Unknown',
            routeColor,
            routeType: row.route_type,
            headsign: row.headsign || 'Bilinmeyen',
            departureTime: departureDate,
            scheduledTime: departureDate,
            isRealtime: false, // Static schedule only
            delay: 0,
          };
        })
        .filter((dep): dep is NextDeparture => dep !== null);

      logger.log(`[IzmirAdapter] Found ${departures.length} departures`);
      return departures;
    } catch (error) {
      logger.error('[IzmirAdapter] Failed to get departures:', error);
      return [];
    }
  }

  /**
   * Get service alerts
   * Note: İzmir doesn't have a public alerts API
   * Returns empty array for now
   */
  async getAlerts(routeIds?: string[]): Promise<Alert[]> {
    logger.log('[IzmirAdapter] Getting alerts...');
    // TODO: Implement web scraping or RSS feed for ESHOT announcements
    return [];
  }

  /**
   * Get data source information
   */
  getDataSource(): DataSource {
    return izmirDataSource;
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
    logger.log('[IzmirAdapter] Initializing adapter...');
    try {
      await db.initializeDatabase();

      // Check if database has data
      const isEmpty = db.isDatabaseEmpty();
      if (isEmpty) {
        logger.warn('[IzmirAdapter] Database is empty - need to import GTFS data');
      } else {
        const stats = db.getDatabaseStats();
        logger.log('[IzmirAdapter] Database initialized with data:', stats);

        // Run database migrations
        const database = db.openDatabase();
        await runMigrations(database);
      }

      this.lastUpdateTime = new Date();
    } catch (error) {
      logger.error('[IzmirAdapter] Failed to initialize:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of İzmir adapter
 */
export const izmirAdapter = new IzmirAdapter();
