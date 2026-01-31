/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free and no API key required
 */

import { logger } from '../utils/logger';
import { captureException } from '../services/crash-reporting';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// User agent required by Nominatim usage policy
// Must include app name and contact info
const USER_AGENT = 'TransitApp/1.0 (+https://github.com/transit-app; contact@transit-app.dev)';

// Referer header (required by some Nominatim instances)
const REFERER = 'https://transit-app.dev';

// Bounding box for İzmir region (to limit search area)
// Format: [west, north, east, south]
const IZMIR_BBOX = [26.6, 38.7, 27.4, 38.2];

// Rate limiting: max 1 request per second (Nominatim usage policy)
// Using 1.5 seconds to be conservative and avoid blocks
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds

async function throttledFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    // Wait for the remaining time
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    logger.log(`[Geocoding] Throttling request, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  logger.log(`[Geocoding] Making request to: ${url}`);
  const response = await fetch(url, options);
  logger.log(`[Geocoding] Response status: ${response.status}`);
  return response;
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  shortAddress?: string; // Short format: "rue, ville"
  city?: string; // Just the city name
  type: string; // 'house', 'street', 'city', etc.
  importance: number; // 0-1, relevance score
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
}

/**
 * Format address to short version: "Numéro Rue, Ville"
 */
function formatShortAddress(item: any): { short: string; city: string } {
  const addr = item.address;
  if (!addr) return { short: item.display_name, city: '' };

  const streetParts: string[] = [];

  // Street with number if available
  if (addr.house_number && addr.road) {
    streetParts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    streetParts.push(addr.road);
  } else if (addr.pedestrian) {
    streetParts.push(addr.pedestrian);
  } else if (addr.amenity) {
    streetParts.push(addr.amenity);
  } else if (addr.suburb) {
    streetParts.push(addr.suburb);
  }

  // Get city
  const city = addr.city || addr.town || addr.village || addr.municipality || '';

  // Build short address: "Rue, Ville"
  const short = streetParts.length > 0 && city
    ? `${streetParts.join(' ')}, ${city}`
    : streetParts.length > 0
    ? streetParts.join(' ')
    : city || item.display_name;

  return { short, city };
}

/**
 * Geocode an address query to coordinates
 * @param query - Address search query
 * @param countryCode - Optional country code to limit results (e.g., 'fr')
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of geocoding results
 */
export async function geocodeAddress(
  query: string,
  countryCode?: string,
  limit: number = 5
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  // Check cache first
  const cacheKey = `geocode_${query.toLowerCase().trim()}_${countryCode || 'any'}_${limit}`;
  const { geocodingCache, GEOCODING_TTL } = await import('./cache');
  const cached = geocodingCache.get<GeocodingResult[]>(cacheKey, GEOCODING_TTL);
  if (cached) {
    logger.log(`[Geocoding] Cache hit for "${query}"`);
    return cached;
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: limit.toString(),
      addressdetails: '1',
      viewbox: IZMIR_BBOX.join(','), // Limit to İzmir
      bounded: '1', // Only return results within viewbox
      ...(countryCode && { countrycodes: countryCode }),
    });

    const response = await throttledFetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': REFERER,
        'Accept-Language': 'tr,en', // Prefer French, fallback to English
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      logger.error(`[Geocoding] Nominatim error response:`, errorText);
      throw new Error(`Nominatim API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    logger.log(`[Geocoding] Received ${data.length || 0} results`);

    const results = data.map((item: any) => {
      const { short, city } = formatShortAddress(item);
      return {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name,
        shortAddress: short,
        city,
        type: item.type,
        importance: item.importance || 0,
        boundingBox: item.boundingbox
          ? [
              parseFloat(item.boundingbox[0]),
              parseFloat(item.boundingbox[1]),
              parseFloat(item.boundingbox[2]),
              parseFloat(item.boundingbox[3]),
            ]
          : undefined,
      };
    });

    // Cache the results
    geocodingCache.set(cacheKey, results);
    logger.log(`[Geocoding] Cached results for "${query}"`);

    return results;
  } catch (error) {
    logger.error('Geocoding error:', error);
    captureException(error, { tags: { module: 'geocoding', action: 'geocode_address' }, extra: { query } });
    throw error;
  }
}

/**
 * Reverse geocode coordinates to an address
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Address string
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
    });

    const response = await throttledFetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': REFERER,
        'Accept-Language': 'tr,en',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      logger.error(`[Geocoding] Nominatim error response:`, errorText);
      throw new Error(`Nominatim API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    logger.log(`[Geocoding] Received ${data.length || 0} results`);

    // Build a readable address from components
    const address = data.address;
    if (!address) {
      return data.display_name;
    }

    // Prefer: house_number + road, or amenity, or display_name
    const parts = [];

    if (address.house_number && address.road) {
      parts.push(`${address.house_number} ${address.road}`);
    } else if (address.road) {
      parts.push(address.road);
    } else if (address.amenity) {
      parts.push(address.amenity);
    }

    if (address.suburb) {
      parts.push(address.suburb);
    } else if (address.city) {
      parts.push(address.city);
    } else if (address.town) {
      parts.push(address.town);
    } else if (address.village) {
      parts.push(address.village);
    }

    return parts.length > 0 ? parts.join(', ') : data.display_name;
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    captureException(error, { tags: { module: 'geocoding', action: 'reverse_geocode' }, extra: { lat, lon } });
    throw error;
  }
}

/**
 * Search for places with autocomplete
 * Optimized for transit app usage (focuses on streets, POIs)
 */
export async function searchPlaces(
  query: string,
  lat?: number,
  lon?: number,
  radius?: number
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '10',
      addressdetails: '1',
      viewbox: IZMIR_BBOX.join(','),
      bounded: '0', // Don't strictly limit, just bias towards İzmir
      countrycodes: 'tr', // Limit to Turkey
      ...(lat && lon && {
        lat: lat.toString(),
        lon: lon.toString(),
        ...(radius && { radius: radius.toString() }),
      }),
    });

    const response = await throttledFetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': REFERER,
        'Accept-Language': 'tr,en',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      logger.error(`[Geocoding] Nominatim error response:`, errorText);
      throw new Error(`Nominatim API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    logger.log(`[Geocoding] Received ${data.length || 0} results`);

    // Filter and sort results
    const results = data
      .map((item: any) => {
        const { short, city } = formatShortAddress(item);
        return {
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          displayName: item.display_name,
          shortAddress: short,
          city,
          type: item.type,
          importance: item.importance || 0,
        };
      })
      .filter((result: GeocodingResult) => {
        // Filter out neighbourhood/suburb-only results, keep streets and addresses
        const validTypes = ['house', 'building', 'street', 'road', 'amenity', 'shop', 'office',
                           'residential', 'pedestrian', 'path', 'city', 'town', 'village'];
        return validTypes.includes(result.type) || result.importance > 0.3;
      })
      .sort((a: GeocodingResult, b: GeocodingResult) => b.importance - a.importance);

    return results;
  } catch (error) {
    logger.error('[Geocoding] Place search error:', error);
    captureException(error, { tags: { module: 'geocoding', action: 'search_places' }, extra: { query } });
    return [];
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
