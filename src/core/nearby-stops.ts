/**
 * Find nearby transit stops within a given radius
 */

import { openDatabase } from './database';
import type { Stop } from './types/models';
import { calculateDistance } from './geocoding';

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
    // Calculate approximate bounding box (rough estimation)
    // 1 degree latitude ≈ 111km
    // 1 degree longitude ≈ 111km * cos(latitude)
    const latDelta = radiusMeters / 111000; // Convert meters to degrees
    const lonDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLon = lon - lonDelta;
    const maxLon = lon + lonDelta;

    // Query stops within bounding box
    const rows = db.getAllSync<any>(
      `SELECT * FROM stops
       WHERE lat BETWEEN ? AND ?
       AND lon BETWEEN ? AND ?
       AND location_type = 0`,
      [minLat, maxLat, minLon, maxLon]
    );

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

    return stopsWithDistance;
  } catch (error) {
    console.error('Failed to find nearby stops:', error);
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
 * @param lat - Latitude
 * @param lon - Longitude
 * @param count - Number of stops to return (default: 5)
 * @param radiusMeters - Search radius (default: 800m)
 * @returns Array of nearby stops sorted by distance
 */
export async function findBestNearbyStops(
  lat: number,
  lon: number,
  count: number = 5,
  radiusMeters: number = 800
): Promise<NearbyStop[]> {
  return findNearbyStops(lat, lon, radiusMeters, count);
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
