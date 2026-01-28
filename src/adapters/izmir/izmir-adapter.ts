/**
 * Izmir Transit Adapter
 * Implements the TransitAdapter interface for Izmir (Metro, Tram, İZBAN, Ferry)
 * Uses local SQLite database populated from official İzmir GTFS feeds
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
import { izmirConfig, izmirDataSources } from './config';
import { runMigrations } from '../../core/database-migration';

/**
 * Izmir adapter implementation
 * Loads data from the local SQLite database populated with Izmir GTFS data
 */
export class IzmirAdapter implements TransitAdapter {
  private lastUpdateTime: Date;
  private initialized: boolean = false;

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
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[IzmirAdapter] Already initialized');
      return;
    }

    console.log('[IzmirAdapter] Initializing...');
    try {
      const database = db.openDatabase();
      await runMigrations(database);
      this.lastUpdateTime = new Date();
      this.initialized = true;
      console.log('[IzmirAdapter] ✅ Initialized successfully');
    } catch (error) {
      console.error('[IzmirAdapter] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load all stops from database
   */
  async loadStops(): Promise<Stop[]> {
    console.log('[IzmirAdapter] Loading stops...');
    try {
      const stops = await db.getAllStops();
      console.log(`[IzmirAdapter] ✅ Loaded ${stops.length} stops`);
      return stops;
    } catch (error) {
      console.error('[IzmirAdapter] ❌ Failed to load stops:', error);
      return [];
    }
  }

  /**
   * Load all routes from database
   */
  async loadRoutes(): Promise<Route[]> {
    console.log('[IzmirAdapter] Loading routes...');
    try {
      const routes = await db.getAllRoutes();
      console.log(`[IzmirAdapter] ✅ Loaded ${routes.length} routes`);
      return routes;
    } catch (error) {
      console.error('[IzmirAdapter] ❌ Failed to load routes:', error);
      return [];
    }
  }

  /**
   * Load all trips from database
   */
  async loadTrips(): Promise<Trip[]> {
    console.log('[IzmirAdapter] Loading trips...');
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

      console.log(`[IzmirAdapter] ✅ Loaded ${trips.length} trips`);
      return trips;
    } catch (error) {
      console.error('[IzmirAdapter] ❌ Failed to load trips:', error);
      return [];
    }
  }

  /**
   * Load all stop times from database
   */
  async loadStopTimes(): Promise<StopTime[]> {
    console.log('[IzmirAdapter] Loading stop times...');
    try {
      const database = db.openDatabase();
      const rows = database.getAllSync<any>('SELECT * FROM stop_times LIMIT 100000');

      const stopTimes: StopTime[] = rows.map((row) => ({
        tripId: row.trip_id,
        arrivalTime: row.arrival_time,
        departureTime: row.departure_time,
        stopId: row.stop_id,
        stopSequence: row.stop_sequence,
      }));

      console.log(`[IzmirAdapter] ✅ Loaded ${stopTimes.length} stop times`);
      return stopTimes;
    } catch (error) {
      console.error('[IzmirAdapter] ❌ Failed to load stop times:', error);
      return [];
    }
  }

  /**
   * Get stop by ID
   */
  async getStopById(stopId: string): Promise<Stop | null> {
    return db.getStopById(stopId);
  }

  /**
   * Get route by ID
   */
  async getRouteById(routeId: string): Promise<Route | null> {
    return db.getRouteById(routeId);
  }

  /**
   * Search stops by name
   */
  async searchStops(query: string, limit: number = 20): Promise<Stop[]> {
    return db.searchStops(query, limit);
  }

  /**
   * Search routes by name
   */
  async searchRoutes(query: string, limit: number = 20): Promise<Route[]> {
    return db.searchRoutes(query, limit);
  }

  /**
   * Get routes serving a stop
   */
  async getRoutesForStop(stopId: string): Promise<Route[]> {
    return db.getRoutesByStopId(stopId);
  }

  /**
   * Get stops along a route
   */
  async getStopsForRoute(routeId: string): Promise<Stop[]> {
    try {
      const database = db.openDatabase();
      // Get distinct stops for this route via trips and stop_times
      const query = `
        SELECT DISTINCT s.*
        FROM stops s
        JOIN stop_times st ON s.id = st.stop_id
        JOIN trips t ON st.trip_id = t.id
        WHERE t.route_id = ?
        ORDER BY st.stop_sequence
      `;
      const rows = database.getAllSync<any>(query, [routeId]);
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        lat: row.lat,
        lon: row.lon,
        locationType: row.location_type || 0,
        parentStation: row.parent_station || null,
      }));
    } catch (error) {
      console.error('[IzmirAdapter] getStopsForRoute failed:', error);
      return [];
    }
  }

  /**
   * Get nearby stops
   */
  async getNearbyStops(lat: number, lon: number, radiusMeters: number = 500): Promise<Stop[]> {
    try {
      // Simple bounding box search (approximate)
      const latDelta = radiusMeters / 111000; // ~111km per degree
      const lonDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));

      const database = db.openDatabase();
      const query = `
        SELECT * FROM stops
        WHERE lat BETWEEN ? AND ?
        AND lon BETWEEN ? AND ?
      `;
      const rows = database.getAllSync<any>(query, [
        lat - latDelta, lat + latDelta,
        lon - lonDelta, lon + lonDelta
      ]);

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        lat: row.lat,
        lon: row.lon,
        locationType: row.location_type || 0,
        parentStation: row.parent_station || null,
      }));
    } catch (error) {
      console.error('[IzmirAdapter] getNearbyStops failed:', error);
      return [];
    }
  }

  /**
   * Get next departures for a stop
   * Uses theoretical schedules from GTFS static data
   */
  async getNextDepartures(stopId: string, useRealtime: boolean = true): Promise<NextDeparture[]> {
    console.log(`[IzmirAdapter] Getting departures for stop ${stopId}`);
    return this.getTheoreticalDepartures(stopId);
  }

  /**
   * Get theoretical departures from GTFS static data
   */
  private async getTheoreticalDepartures(stopId: string): Promise<NextDeparture[]> {
    try {
      const database = db.openDatabase();
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

      const query = `
        SELECT
          st.trip_id,
          st.departure_time,
          t.headsign,
          r.id as route_id,
          r.short_name as route_short_name,
          r.color as route_color
        FROM stop_times st
        JOIN trips t ON st.trip_id = t.id
        JOIN routes r ON t.route_id = r.id
        WHERE st.stop_id = ?
          AND st.departure_time >= ?
        ORDER BY st.departure_time
        LIMIT 10
      `;

      const rows = database.getAllSync<any>(query, [stopId, currentTime]);

      return rows.map((row) => {
        const [hours, minutes] = row.departure_time.split(':').map(Number);
        const departureTime = new Date(now);
        departureTime.setHours(hours, minutes, 0, 0);

        // Handle times after midnight (e.g., 25:30:00)
        if (hours >= 24) {
          departureTime.setDate(departureTime.getDate() + 1);
          departureTime.setHours(hours - 24, minutes, 0, 0);
        }

        return {
          tripId: row.trip_id,
          routeId: row.route_id,
          routeShortName: row.route_short_name || '',
          routeColor: row.route_color,
          headsign: row.headsign || '',
          departureTime,
          scheduledTime: departureTime,
          isRealtime: false,
          delay: 0,
        };
      });
    } catch (error) {
      console.error('[IzmirAdapter] Error getting theoretical departures:', error);
      return [];
    }
  }

  /**
   * Get service alerts
   * Currently returns empty array (no alerts API for Izmir yet)
   */
  async getAlerts(): Promise<Alert[]> {
    return [];
  }

  /**
   * Get data source information
   */
  getDataSource(): DataSource {
    return izmirDataSources[0];
  }

  /**
   * Get all data sources
   */
  getAllDataSources(): DataSource[] {
    return izmirDataSources;
  }

  /**
   * Get last update time (required by TransitAdapter interface)
   */
  getLastUpdate(): Date {
    return this.lastUpdateTime;
  }

  /**
   * Get last update time (legacy method name)
   */
  getLastUpdateTime(): Date {
    return this.lastUpdateTime;
  }
}

// Singleton instance
export const izmirAdapter = new IzmirAdapter();
