/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free and no API key required
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// User agent required by Nominatim usage policy
// Must include app name and contact info
const USER_AGENT = 'TransitApp/1.0 (transit-app-mobile; contact@transit-app.dev)';

// Rate limiting: max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function throttledFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    // Wait for the remaining time
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  type: string; // 'house', 'street', 'city', etc.
  importance: number; // 0-1, relevance score
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
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

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: limit.toString(),
      addressdetails: '1',
      ...(countryCode && { countrycodes: countryCode }),
    });

    const response = await throttledFetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'fr,en', // Prefer French, fallback to English
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
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
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
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
        'Accept-Language': 'fr,en',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

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
    console.error('Reverse geocoding error:', error);
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
      ...(lat && lon && {
        lat: lat.toString(),
        lon: lon.toString(),
        ...(radius && { radius: radius.toString() }),
      }),
    });

    const response = await throttledFetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'fr,en',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter and sort results
    const results = data
      .map((item: any) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name,
        type: item.type,
        importance: item.importance || 0,
      }))
      .filter((result: GeocodingResult) => {
        // Prioritize useful types for transit
        const goodTypes = ['house', 'building', 'street', 'road', 'amenity', 'shop', 'office'];
        return goodTypes.includes(result.type) || result.importance > 0.3;
      })
      .sort((a: GeocodingResult, b: GeocodingResult) => b.importance - a.importance);

    return results;
  } catch (error) {
    console.error('Place search error:', error);
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
