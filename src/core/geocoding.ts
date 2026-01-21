/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free and no API key required
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// User agent required by Nominatim usage policy
// Must include app name and contact info
const USER_AGENT = 'TransitApp/1.0 (+https://github.com/transit-app; contact@transit-app.dev)';

// Referer header (required by some Nominatim instances)
const REFERER = 'https://transit-app.dev';

// Bounding box for Île-de-France region (to limit search area)
// Format: [west, north, east, south]
const ILE_DE_FRANCE_BBOX = [1.45, 49.24, 3.56, 48.12];

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
    console.log(`[Geocoding] Throttling request, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  console.log(`[Geocoding] Making request to: ${url}`);
  const response = await fetch(url, options);
  console.log(`[Geocoding] Response status: ${response.status}`);
  return response;
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  shortAddress?: string; // Short format: "rue, ville"
  type: string; // 'house', 'street', 'city', etc.
  importance: number; // 0-1, relevance score
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
}

/**
 * Format address to short version: "street, city"
 */
function formatShortAddress(item: any): string {
  const addr = item.address;
  if (!addr) return item.display_name;

  const parts: string[] = [];

  // Street with number if available
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`);
  } else if (addr.road) {
    parts.push(addr.road);
  } else if (addr.pedestrian) {
    parts.push(addr.pedestrian);
  } else if (addr.amenity) {
    parts.push(addr.amenity);
  }

  // City/town
  if (addr.city) {
    parts.push(addr.city);
  } else if (addr.town) {
    parts.push(addr.town);
  } else if (addr.village) {
    parts.push(addr.village);
  } else if (addr.municipality) {
    parts.push(addr.municipality);
  }

  return parts.length > 0 ? parts.join(', ') : item.display_name;
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
      viewbox: ILE_DE_FRANCE_BBOX.join(','), // Limit to Île-de-France
      bounded: '1', // Only return results within viewbox
      ...(countryCode && { countrycodes: countryCode }),
    });

    const response = await throttledFetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': REFERER,
        'Accept-Language': 'fr,en', // Prefer French, fallback to English
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      console.error(`[Geocoding] Nominatim error response:`, errorText);
      throw new Error(`Nominatim API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Geocoding] Received ${data.length || 0} results`);

    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
      shortAddress: formatShortAddress(item),
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
        'Referer': REFERER,
        'Accept-Language': 'fr,en',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      console.error(`[Geocoding] Nominatim error response:`, errorText);
      throw new Error(`Nominatim API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Geocoding] Received ${data.length || 0} results`);

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
      viewbox: ILE_DE_FRANCE_BBOX.join(','),
      bounded: '1', // Only return results within Île-de-France
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
        'Accept-Language': 'fr,en',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      console.error(`[Geocoding] Nominatim error response:`, errorText);
      throw new Error(`Nominatim API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Geocoding] Received ${data.length || 0} results`);

    // Filter and sort results
    const results = data
      .map((item: any) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name,
        shortAddress: formatShortAddress(item),
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
    console.error('[Geocoding] Place search error:', error);
    if (error instanceof Error) {
      console.error('[Geocoding] Error message:', error.message);
      console.error('[Geocoding] Error stack:', error.stack);
    }
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
