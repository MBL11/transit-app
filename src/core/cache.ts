/**
 * Simple in-memory cache with TTL support
 * Used for geocoding results, nearby stops, and other expensive operations
 */

import { logger } from '../utils/logger';

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get<T>(key: string, ttlMs: number): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    // Prevent unbounded growth - remove oldest entries if full
    if (this.store.size >= this.maxSize) {
      const keysToDelete: string[] = [];
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove 10% of oldest entries
      const toRemove = Math.ceil(this.maxSize * 0.1);
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        keysToDelete.push(entries[i][0]);
      }

      for (const k of keysToDelete) {
        this.store.delete(k);
      }
    }

    this.store.set(key, { data, timestamp: Date.now() });
  }

  has(key: string, ttlMs: number): boolean {
    return this.get(key, ttlMs) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// General purpose cache
export const cache = new Cache();

// Specialized caches with appropriate sizes
export const geocodingCache = new Cache(200); // 200 geocoding results
export const nearbyStopsCache = new Cache(100); // 100 nearby stops queries

// TTL constants
export const GEOCODING_TTL = 3600000; // 1 hour
export const NEARBY_STOPS_TTL = 300000; // 5 minutes
export const ROUTES_TTL = 60000; // 1 minute

/**
 * Generate cache key for geocoding
 */
export function geocodingCacheKey(query: string, countryCode?: string): string {
  return `geo_${query.toLowerCase().trim()}_${countryCode || 'any'}`;
}

/**
 * Generate cache key for nearby stops
 */
export function nearbyStopsCacheKey(lat: number, lon: number, radius: number): string {
  // Round coordinates to 4 decimal places (~11m precision)
  const latRounded = Math.round(lat * 10000) / 10000;
  const lonRounded = Math.round(lon * 10000) / 10000;
  return `nearby_${latRounded}_${lonRounded}_${radius}`;
}

/**
 * Clear all caches (useful after data update)
 */
export function clearAllCaches(): void {
  cache.clear();
  geocodingCache.clear();
  nearbyStopsCache.clear();
  logger.log('[Cache] All caches cleared');
}
