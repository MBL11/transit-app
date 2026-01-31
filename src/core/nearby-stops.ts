/**
 * Find nearby transit stops within a given radius
 */

import { openDatabase } from './database';
import type { Stop } from './types/models';
import { calculateDistance } from './geocoding';
import { logger } from '../utils/logger';

export interface NearbyStop extends Stop {
  distance: number; // Distance in meters from search point
}

/**
 * Find all stops within a given radius of a location
 * @param lat - Latitude of search center
 * @param lon - Longitude of search center
 * @param radiusMeters - Search radius in meters (default: 500m)
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of stops sorted by distance
 */
export async function findNearbyStops(
  lat: number,
  lon: number,
  radiusMeters: number = 500,
  limit: number = 10
): Promise<NearbyStop[]> {
  const db = openDatabase();

  try {
    logger.log(`[NearbyStops] Searching for stops within ${radiusMeters}m of (${lat}, ${lon})`);

    // Calculate approximate bounding box (rough estimation)
    // 1 degree latitude ≈ 111km
    // 1 degree longitude ≈ 111km * cos(latitude)
    const latDelta = radiusMeters / 111000; // Convert meters to degrees
    const lonDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLon = lon - lonDelta;
    const maxLon = lon + lonDelta;

    logger.log(`[NearbyStops] Bounding box: lat [${minLat}, ${maxLat}], lon [${minLon}, ${maxLon}]`);

    // First, check how many stops exist in database
    const totalStops = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM stops WHERE location_type = 0'
    );
    logger.log(`[NearbyStops] Total stops in database: ${totalStops?.count || 0}`);

    // Query stops within bounding box
    const rows = db.getAllSync<any>(
      `SELECT * FROM stops
       WHERE lat BETWEEN ? AND ?
       AND lon BETWEEN ? AND ?
       AND location_type = 0`,
      [minLat, maxLat, minLon, maxLon]
    );

    logger.log(`[NearbyStops] Found ${rows.length} stops in bounding box`);

    // Calculate exact distances and filter by radius
    const stopsWithDistance: NearbyStop[] = rows
      .map((row) => {
        const distance = calculateDistance(lat, lon, row.lat, row.lon);

        return {
          id: row.id,
          name: row.name,
          lat: row.lat,
          lon: row.lon,
          locationType: row.location_type,
          parentStation: row.parent_station,
          distance,
        };
      })
      .filter((stop) => stop.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    logger.log(`[NearbyStops] After distance filtering: ${stopsWithDistance.length} stops`);
    if (stopsWithDistance.length > 0) {
      logger.log(`[NearbyStops] Closest stop: ${stopsWithDistance[0].name} at ${Math.round(stopsWithDistance[0].distance)}m`);
    }

    return stopsWithDistance;
  } catch (error) {
    logger.error('[NearbyStops] Failed to find nearby stops:', error);
    throw error;
  }
}

/**
 * Find the closest stop to a location
 * @param lat - Latitude
 * @param lon - Longitude
 * @param maxDistance - Maximum search radius in meters (default: 1000m)
 * @returns Closest stop or null if none found
 */
export async function findClosestStop(
  lat: number,
  lon: number,
  maxDistance: number = 1000
): Promise<NearbyStop | null> {
  const nearbyStops = await findNearbyStops(lat, lon, maxDistance, 1);
  return nearbyStops.length > 0 ? nearbyStops[0] : null;
}

/**
 * Find multiple nearby stops and return best candidates
 * Useful for routing when we want several options
 * Groups stops by station name and returns the closest entry point for each unique station
 * @param lat - Latitude
 * @param lon - Longitude
 * @param count - Number of unique stations to return (default: 5)
 * @param radiusMeters - Search radius (default: 800m)
 * @returns Array of nearby stops sorted by distance, deduplicated by station name
 */
export async function findBestNearbyStops(
  lat: number,
  lon: number,
  count: number = 5,
  radiusMeters: number = 800
): Promise<NearbyStop[]> {
  // Get more stops initially to allow deduplication
  const allNearbyStops = await findNearbyStops(lat, lon, radiusMeters, count * 5);

  // Deduplicate by station name - keep only the closest stop for each unique station
  // This handles cases where same station has multiple stop IDs (e.g., M1_SAINT_PAUL, M8_SAINT_PAUL)
  const stationMap = new Map<string, NearbyStop>();

  for (const stop of allNearbyStops) {
    // Normalize station name (remove line prefix like "M1_", handle accents)
    const stationName = normalizeStationName(stop.name);

    if (!stationMap.has(stationName)) {
      stationMap.set(stationName, stop);
    }
    // If already exists, we keep the first one (which is closer due to sorting)
  }

  // Convert back to array and return top N
  const uniqueStations = Array.from(stationMap.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);

  logger.log(`[NearbyStops] Deduplicated ${allNearbyStops.length} stops to ${uniqueStations.length} unique stations`);

  return uniqueStations;
}

/**
 * Normalize station name for deduplication
 * Removes line prefixes and normalizes accents
 */
function normalizeStationName(name: string): string {
  return name
    // Remove common prefixes like "M1_", "RER_A_", etc.
    .replace(/^(M\d+_|RER_[A-Z]_|T\d+_|BUS_\d+_)/i, '')
    // Normalize accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Lowercase for comparison
    .toLowerCase()
    .trim();
}

/**
 * Check if a location is within walking distance of transit
 * @param lat - Latitude
 * @param lon - Longitude
 * @param maxWalkingDistance - Maximum walking distance in meters (default: 800m)
 * @returns True if at least one stop is within walking distance
 */
export async function isWithinWalkingDistance(
  lat: number,
  lon: number,
  maxWalkingDistance: number = 800
): Promise<boolean> {
  const nearbyStops = await findNearbyStops(lat, lon, maxWalkingDistance, 1);
  return nearbyStops.length > 0;
}

/**
 * Get walking time estimate to a stop
 * Assumes average walking speed of 5 km/h (1.39 m/s)
 * @param distanceMeters - Distance in meters
 * @returns Walking time in minutes
 */
export function getWalkingTime(distanceMeters: number): number {
  const walkingSpeedMetersPerSecond = 1.39; // 5 km/h
  const timeInSeconds = distanceMeters / walkingSpeedMetersPerSecond;
  return Math.ceil(timeInSeconds / 60); // Round up to nearest minute
}

/**
 * Format distance for display
 * @param distanceMeters - Distance in meters
 * @returns Formatted string (e.g., "350m" or "1.2km")
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  } else {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }
}
