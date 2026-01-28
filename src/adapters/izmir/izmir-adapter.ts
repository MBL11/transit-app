/**
 * Izmir Transit Adapter
 * Implements the TransitAdapter interface for Izmir (ESHOT, Metro, IZBAN)
 * Uses Transitland API for data - no local GTFS download needed
 */

import type {
  TransitAdapter,
  AdapterConfig,
  NextDeparture,
  Alert,
  DataSource,
} from '../../core/types/adapter';
import type { Stop, Route, Trip, StopTime } from '../../core/types/models';
import { izmirConfig, izmirDataSources } from './config';
import * as transitland from '../../services/transitland-api';

// Cache for API responses
interface Cache<T> {
  data: T | null;
  timestamp: number;
  ttl: number;
}

const CACHE_TTL = {
  stops: 5 * 60 * 1000,      // 5 minutes
  routes: 10 * 60 * 1000,    // 10 minutes
  departures: 30 * 1000,     // 30 seconds
};

/**
 * Izmir adapter implementation using Transitland API
 */
export class IzmirAdapter implements TransitAdapter {
  private lastUpdateTime: Date;
  private stopsCache: Cache<Stop[]> = { data: null, timestamp: 0, ttl: CACHE_TTL.stops };
  private routesCache: Cache<Route[]> = { data: null, timestamp: 0, ttl: CACHE_TTL.routes };
  private nearbyStopsCache: Map<string, Cache<Stop[]>> = new Map();

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
    console.log('[IzmirAdapter] Initializing with Transitland API...');
    this.lastUpdateTime = new Date();
    console.log('[IzmirAdapter] ✅ Initialized successfully (using Transitland API)');
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid<T>(cache: Cache<T>): boolean {
    return cache.data !== null && (Date.now() - cache.timestamp) < cache.ttl;
  }

  /**
   * Load all stops from Transitland API
   */
  async loadStops(): Promise<Stop[]> {
    console.log('[IzmirAdapter] Loading stops from Transitland...');

    // Check cache
    if (this.isCacheValid(this.stopsCache)) {
      console.log('[IzmirAdapter] ✅ Returning cached stops');
      return this.stopsCache.data!;
    }

    try {
      const transitlandStops = await transitland.getStopsInBbox();
      const stops: Stop[] = transitlandStops.map(s => ({
        id: s.onestop_id,
        name: s.stop_name,
        lat: s.geometry.coordinates[1],
        lon: s.geometry.coordinates[0],
        locationType: s.location_type || 0,
        parentStation: s.parent?.stop_id || null,
      }));

      // Update cache
      this.stopsCache = { data: stops, timestamp: Date.now(), ttl: CACHE_TTL.stops };

      console.log(`[IzmirAdapter] ✅ Loaded ${stops.length} stops from Transitland`);
      return stops;
    } catch (error) {
      console.error('[IzmirAdapter] ❌ Failed to load stops:', error);
      // Return cached data if available, even if stale
      if (this.stopsCache.data) {
        console.log('[IzmirAdapter] Returning stale cached stops');
        return this.stopsCache.data;
      }
      throw new Error('Failed to load stops from Transitland');
    }
  }

  /**
   * Load all routes from Transitland API
   */
  async loadRoutes(): Promise<Route[]> {
    console.log('[IzmirAdapter] Loading routes from Transitland...');

    // Check cache
    if (this.isCacheValid(this.routesCache)) {
      console.log('[IzmirAdapter] ✅ Returning cached routes');
      return this.routesCache.data!;
    }

    try {
      const transitlandRoutes = await transitland.getIzmirRoutes();
      const routes: Route[] = transitlandRoutes.map(r => ({
        id: r.onestop_id,
        shortName: r.route_short_name || '',
        longName: r.route_long_name || '',
        type: r.route_type,
        color: r.route_color || null,
        textColor: r.route_text_color || null,
      }));

      // Update cache
      this.routesCache = { data: routes, timestamp: Date.now(), ttl: CACHE_TTL.routes };

      console.log(`[IzmirAdapter] ✅ Loaded ${routes.length} routes from Transitland`);
      return routes;
    } catch (error) {
      console.error('[IzmirAdapter] ❌ Failed to load routes:', error);
      if (this.routesCache.data) {
        console.log('[IzmirAdapter] Returning stale cached routes');
        return this.routesCache.data;
      }
      throw new Error('Failed to load routes from Transitland');
    }
  }

  /**
   * Load trips - not fully supported via Transitland REST API
   * Returns empty array (trips are fetched on-demand with departures)
   */
  async loadTrips(): Promise<Trip[]> {
    console.log('[IzmirAdapter] Trips loaded on-demand via departures API');
    return [];
  }

  /**
   * Load stop times - not supported via Transitland REST API
   * Returns empty array (stop times are fetched on-demand with departures)
   */
  async loadStopTimes(): Promise<StopTime[]> {
    console.log('[IzmirAdapter] Stop times loaded on-demand via departures API');
    return [];
  }

  /**
   * Get stop by ID
   */
  async getStopById(stopId: string): Promise<Stop | null> {
    const stops = await this.loadStops();
    return stops.find(s => s.id === stopId) || null;
  }

  /**
   * Get route by ID
   */
  async getRouteById(routeId: string): Promise<Route | null> {
    const routes = await this.loadRoutes();
    return routes.find(r => r.id === routeId) || null;
  }

  /**
   * Search stops by name
   */
  async searchStops(query: string, limit: number = 20): Promise<Stop[]> {
    if (!query || query.length < 2) return [];

    try {
      const transitlandStops = await transitland.searchStops(query);
      return transitlandStops.slice(0, limit).map(s => ({
        id: s.onestop_id,
        name: s.stop_name,
        lat: s.geometry.coordinates[1],
        lon: s.geometry.coordinates[0],
        locationType: s.location_type || 0,
        parentStation: s.parent?.stop_id || null,
      }));
    } catch (error) {
      console.error('[IzmirAdapter] Search stops failed:', error);
      // Fallback to cached stops
      const stops = this.stopsCache.data || [];
      const queryLower = query.toLowerCase();
      return stops.filter(s => s.name.toLowerCase().includes(queryLower)).slice(0, limit);
    }
  }

  /**
   * Search routes by name
   */
  async searchRoutes(query: string, limit: number = 20): Promise<Route[]> {
    if (!query) return [];

    try {
      const transitlandRoutes = await transitland.searchRoutes(query);
      return transitlandRoutes.slice(0, limit).map(r => ({
        id: r.onestop_id,
        shortName: r.route_short_name || '',
        longName: r.route_long_name || '',
        type: r.route_type,
        color: r.route_color || null,
        textColor: r.route_text_color || null,
      }));
    } catch (error) {
      console.error('[IzmirAdapter] Search routes failed:', error);
      const routes = this.routesCache.data || [];
      const queryLower = query.toLowerCase();
      return routes.filter(r =>
        r.shortName.toLowerCase().includes(queryLower) ||
        r.longName.toLowerCase().includes(queryLower)
      ).slice(0, limit);
    }
  }

  /**
   * Get routes serving a stop
   */
  async getRoutesForStop(stopId: string): Promise<Route[]> {
    // For now, return all routes (Transitland REST doesn't have direct stop->routes endpoint)
    // TODO: Use GraphQL API for more precise queries
    const routes = await this.loadRoutes();
    return routes;
  }

  /**
   * Get stops along a route
   */
  async getStopsForRoute(routeId: string): Promise<Stop[]> {
    // For now, return all stops (Transitland REST doesn't have direct route->stops endpoint)
    // TODO: Use GraphQL API for more precise queries
    const stops = await this.loadStops();
    return stops;
  }

  /**
   * Get nearby stops using Transitland API
   */
  async getNearbyStops(lat: number, lon: number, radiusMeters: number = 500): Promise<Stop[]> {
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusMeters}`;

    // Check cache
    const cached = this.nearbyStopsCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.data!;
    }

    try {
      const transitlandStops = await transitland.getNearbyStops(lat, lon, radiusMeters);
      const stops: Stop[] = transitlandStops.map(s => ({
        id: s.onestop_id,
        name: s.stop_name,
        lat: s.geometry.coordinates[1],
        lon: s.geometry.coordinates[0],
        locationType: s.location_type || 0,
        parentStation: s.parent?.stop_id || null,
      }));

      // Update cache
      this.nearbyStopsCache.set(cacheKey, {
        data: stops,
        timestamp: Date.now(),
        ttl: CACHE_TTL.stops,
      });

      return stops;
    } catch (error) {
      console.error('[IzmirAdapter] getNearbyStops failed:', error);
      return [];
    }
  }

  /**
   * Get next departures for a stop using Transitland API
   */
  async getNextDepartures(stopId: string, useRealtime: boolean = true): Promise<NextDeparture[]> {
    console.log(`[IzmirAdapter] Getting departures for stop ${stopId}`);

    try {
      const departures = await transitland.getDepartures(stopId, 20);

      return departures.map(d => {
        const converted = transitland.convertDeparture(d);
        return {
          tripId: converted.tripId,
          routeId: converted.routeId,
          routeShortName: converted.routeShortName,
          routeColor: converted.routeColor,
          headsign: converted.headsign,
          departureTime: converted.departureTime,
          scheduledTime: converted.departureTime,
          isRealtime: false,
          delay: 0,
        };
      });
    } catch (error) {
      console.error('[IzmirAdapter] Error getting departures:', error);
      return [];
    }
  }

  /**
   * Get service alerts
   * Transitland doesn't provide alerts via REST API
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
