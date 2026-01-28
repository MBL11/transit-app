/**
 * Transitland API Service
 * Fetches transit data from Transitland's REST API
 * https://www.transit.land/documentation
 */

const TRANSITLAND_API_BASE = 'https://transit.land/api/v2/rest';

// API key from environment (user needs to set this)
const getApiKey = (): string => {
  const key = process.env.EXPO_PUBLIC_TRANSITLAND_API_KEY;
  if (!key) {
    console.warn('[Transitland] No API key found. Set EXPO_PUBLIC_TRANSITLAND_API_KEY in .env');
    return '';
  }
  return key;
};

// İzmir bounding box
const IZMIR_BBOX = {
  minLon: 26.6,
  minLat: 38.2,
  maxLon: 27.4,
  maxLat: 38.7,
};

// İzmir operator IDs on Transitland
export const IZMIR_OPERATORS = {
  ESHOT: 'o-swg-eshot',
  METRO: 'o-swg6-metroizmir',
  IZBAN: 'o-swg-izban',
};

interface TransitlandStop {
  id: number;
  onestop_id: string;
  stop_id: string;
  stop_name: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  location_type?: number;
  parent?: { id: number; stop_id: string };
}

interface TransitlandRoute {
  id: number;
  onestop_id: string;
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
  route_text_color?: string;
  agency: {
    agency_name: string;
    onestop_id: string;
  };
}

interface TransitlandDeparture {
  trip: {
    trip_id: string;
    trip_headsign: string;
    route: {
      route_id: string;
      route_short_name: string;
      route_color?: string;
    };
  };
  departure_time: string;
  arrival_time: string;
  stop_sequence: number;
  service_date: string;
}

interface TransitlandResponse<T> {
  stops?: T[];
  routes?: T[];
  departures?: T[];
  meta?: {
    after?: number;
    next?: string;
  };
}

/**
 * Make authenticated request to Transitland API
 */
async function transitlandFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(`${TRANSITLAND_API_BASE}${endpoint}`);

  // Add params
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Add API key
  if (apiKey) {
    url.searchParams.append('apikey', apiKey);
  }

  console.log(`[Transitland] Fetching: ${endpoint}`);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[Transitland] API error ${response.status}:`, errorText);
    throw new Error(`Transitland API error: ${response.status} - ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get stops near a location
 */
export async function getNearbyStops(
  lat: number,
  lon: number,
  radius: number = 500 // meters
): Promise<TransitlandStop[]> {
  const response = await transitlandFetch<TransitlandResponse<TransitlandStop>>('/stops', {
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
    limit: '50',
  });

  return response.stops || [];
}

/**
 * Get stops within İzmir bounding box
 */
export async function getStopsInBbox(
  bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number }
): Promise<TransitlandStop[]> {
  const box = bbox || IZMIR_BBOX;
  const bboxStr = `${box.minLon},${box.minLat},${box.maxLon},${box.maxLat}`;

  const response = await transitlandFetch<TransitlandResponse<TransitlandStop>>('/stops', {
    bbox: bboxStr,
    limit: '1000', // Get many stops
  });

  return response.stops || [];
}

/**
 * Get all routes for İzmir operators
 */
export async function getIzmirRoutes(): Promise<TransitlandRoute[]> {
  const allRoutes: TransitlandRoute[] = [];

  // Fetch routes for each operator
  for (const [name, operatorId] of Object.entries(IZMIR_OPERATORS)) {
    try {
      const response = await transitlandFetch<TransitlandResponse<TransitlandRoute>>('/routes', {
        operator_onestop_id: operatorId,
        limit: '500',
      });

      if (response.routes) {
        console.log(`[Transitland] Found ${response.routes.length} routes for ${name}`);
        allRoutes.push(...response.routes);
      }
    } catch (error) {
      console.warn(`[Transitland] Failed to fetch routes for ${name}:`, error);
    }
  }

  return allRoutes;
}

/**
 * Get departures for a specific stop
 */
export async function getDepartures(
  stopOnestopId: string,
  limit: number = 20
): Promise<TransitlandDeparture[]> {
  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

  const response = await transitlandFetch<TransitlandResponse<TransitlandDeparture>>(`/stops/${stopOnestopId}/departures`, {
    service_date: today,
    start_time: currentTime,
    limit: limit.toString(),
  });

  return response.departures || [];
}

/**
 * Search stops by name
 */
export async function searchStops(query: string): Promise<TransitlandStop[]> {
  if (!query || query.length < 2) return [];

  const response = await transitlandFetch<TransitlandResponse<TransitlandStop>>('/stops', {
    search: query,
    bbox: `${IZMIR_BBOX.minLon},${IZMIR_BBOX.minLat},${IZMIR_BBOX.maxLon},${IZMIR_BBOX.maxLat}`,
    limit: '20',
  });

  return response.stops || [];
}

/**
 * Search routes by name
 */
export async function searchRoutes(query: string): Promise<TransitlandRoute[]> {
  if (!query || query.length < 1) return [];

  const allRoutes = await getIzmirRoutes();
  const queryLower = query.toLowerCase();

  return allRoutes.filter(route =>
    route.route_short_name?.toLowerCase().includes(queryLower) ||
    route.route_long_name?.toLowerCase().includes(queryLower)
  );
}

/**
 * Convert Transitland stop to our internal Stop format
 */
export function convertStop(transitlandStop: TransitlandStop): {
  id: string;
  name: string;
  lat: number;
  lon: number;
  locationType: number;
  parentStation: string | null;
} {
  return {
    id: transitlandStop.onestop_id,
    name: transitlandStop.stop_name,
    lat: transitlandStop.geometry.coordinates[1],
    lon: transitlandStop.geometry.coordinates[0],
    locationType: transitlandStop.location_type || 0,
    parentStation: transitlandStop.parent?.stop_id || null,
  };
}

/**
 * Convert Transitland route to our internal Route format
 */
export function convertRoute(transitlandRoute: TransitlandRoute): {
  id: string;
  shortName: string;
  longName: string;
  type: number;
  color: string | null;
  textColor: string | null;
  agencyId: string;
} {
  return {
    id: transitlandRoute.onestop_id,
    shortName: transitlandRoute.route_short_name || '',
    longName: transitlandRoute.route_long_name || '',
    type: transitlandRoute.route_type,
    color: transitlandRoute.route_color || null,
    textColor: transitlandRoute.route_text_color || null,
    agencyId: transitlandRoute.agency?.onestop_id || '',
  };
}

/**
 * Convert Transitland departure to our NextDeparture format
 */
export function convertDeparture(departure: TransitlandDeparture): {
  tripId: string;
  routeId: string;
  routeShortName: string;
  routeColor?: string;
  headsign: string;
  departureTime: Date;
  isRealtime: boolean;
  delay: number;
} {
  // Parse departure time (format: HH:MM:SS)
  const [hours, minutes, seconds] = departure.departure_time.split(':').map(Number);
  const departureDate = new Date(departure.service_date);
  departureDate.setHours(hours, minutes, seconds || 0);

  return {
    tripId: departure.trip.trip_id,
    routeId: departure.trip.route.route_id,
    routeShortName: departure.trip.route.route_short_name || '',
    routeColor: departure.trip.route.route_color,
    headsign: departure.trip.trip_headsign || '',
    departureTime: departureDate,
    isRealtime: false, // Transitland REST API doesn't include realtime
    delay: 0,
  };
}
