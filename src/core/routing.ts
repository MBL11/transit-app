import Heap from 'heap-js';
import * as db from './database';
import { Stop, Route } from './types/models';
import { JourneyResult, RouteSegment } from './types/routing';
import { geocodeAddress, GeocodingResult } from './geocoding';
import { findBestNearbyStops, NearbyStop, getWalkingTime } from './nearby-stops';

// Calcule la distance entre 2 points GPS (en mètres)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Temps de marche en minutes (5 km/h)
function walkingTime(distanceMeters: number): number {
  return distanceMeters / 83.33; // 5000m / 60min = 83.33 m/min
}

// Parse "HH:MM:SS" en minutes depuis minuit
function parseGtfsTime(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 60 + m + s / 60;
}

export async function findRoute(
  fromStopId: string,
  toStopId: string,
  departureTime: Date
): Promise<JourneyResult[]> {

  // 1. Charge les stops
  const fromStop = await db.getStopById(fromStopId);
  const toStop = await db.getStopById(toStopId);

  if (!fromStop || !toStop) {
    throw new Error('Stop not found');
  }

  // 2. Vérifie si marche directe possible (< 500m)
  const directDistance = haversineDistance(fromStop.lat, fromStop.lon, toStop.lat, toStop.lon);
  if (directDistance < 500) {
    const walkTime = walkingTime(directDistance);
    return [{
      segments: [{
        type: 'walk',
        from: fromStop,
        to: toStop,
        duration: Math.round(walkTime),
        distance: Math.round(directDistance),
      }],
      totalDuration: Math.round(walkTime),
      totalWalkDistance: Math.round(directDistance),
      numberOfTransfers: 0,
      departureTime: departureTime,
      arrivalTime: new Date(departureTime.getTime() + walkTime * 60000),
    }];
  }

  // 3. Algorithme simplifié : trouve les lignes directes d'abord
  const journeys: JourneyResult[] = [];

  // Récupère les routes qui passent par les deux arrêts
  const fromRoutes = await db.getRoutesByStopId(fromStopId);
  const toRoutes = await db.getRoutesByStopId(toStopId);

  // Trouve les routes communes (trajet direct)
  const fromRouteIds = new Set(fromRoutes.map(r => r.id));
  const directRoutes = toRoutes.filter(r => fromRouteIds.has(r.id));

  for (const route of directRoutes.slice(0, 3)) { // Max 3 itinéraires directs
    // Estime le temps de trajet (simplifié : 2 min par arrêt)
    const estimatedDuration = 15; // TODO: calculer vraiment avec stop_times

    const journey: JourneyResult = {
      segments: [{
        type: 'transit',
        from: fromStop,
        to: toStop,
        route: route,
        departureTime: departureTime,
        arrivalTime: new Date(departureTime.getTime() + estimatedDuration * 60000),
        duration: estimatedDuration,
      }],
      totalDuration: estimatedDuration,
      totalWalkDistance: 0,
      numberOfTransfers: 0,
      departureTime: departureTime,
      arrivalTime: new Date(departureTime.getTime() + estimatedDuration * 60000),
    };

    journeys.push(journey);
  }

  // Si pas de trajet direct, retourne un message (à améliorer plus tard)
  if (journeys.length === 0) {
    // Retourne un trajet à pied comme fallback
    const walkTime = walkingTime(directDistance);
    journeys.push({
      segments: [{
        type: 'walk',
        from: fromStop,
        to: toStop,
        duration: Math.round(walkTime),
        distance: Math.round(directDistance),
      }],
      totalDuration: Math.round(walkTime),
      totalWalkDistance: Math.round(directDistance),
      numberOfTransfers: 0,
      departureTime: departureTime,
      arrivalTime: new Date(departureTime.getTime() + walkTime * 60000),
    });
  }

  return journeys;
}

/**
 * Find routes between two locations (coordinates already known, no geocoding needed)
 * Useful for "current location" where GPS coordinates are already available
 * @param fromLocation - Starting location with lat/lon
 * @param toLocation - Destination location with lat/lon
 * @param departureTime - Departure time
 * @returns Array of journey results with walking segments to/from stops
 */
export async function findRouteFromLocations(
  fromLocation: GeocodingResult,
  toLocation: GeocodingResult,
  departureTime: Date
): Promise<JourneyResult[]> {
  try {
    console.log('[Routing] From:', fromLocation.displayName || fromLocation.shortAddress);
    console.log('[Routing] To:', toLocation.displayName || toLocation.shortAddress);

    // 1. Check if walking distance is reasonable (< 2km)
    const directDistance = haversineDistance(
      fromLocation.lat,
      fromLocation.lon,
      toLocation.lat,
      toLocation.lon
    );

    // If very close (< 500m), just walk
    if (directDistance < 500) {
      const walkTime = walkingTime(directDistance);

      // Create virtual stops for the locations
      const fromVirtualStop: Stop = {
        id: 'virtual_from',
        name: fromLocation.shortAddress || fromLocation.displayName,
        lat: fromLocation.lat,
        lon: fromLocation.lon,
        locationType: 0,
      };

      const toVirtualStop: Stop = {
        id: 'virtual_to',
        name: toLocation.shortAddress || toLocation.displayName,
        lat: toLocation.lat,
        lon: toLocation.lon,
        locationType: 0,
      };

      return [{
        segments: [{
          type: 'walk',
          from: fromVirtualStop,
          to: toVirtualStop,
          duration: Math.round(walkTime),
          distance: Math.round(directDistance),
        }],
        totalDuration: Math.round(walkTime),
        totalWalkDistance: Math.round(directDistance),
        numberOfTransfers: 0,
        departureTime: departureTime,
        arrivalTime: new Date(departureTime.getTime() + walkTime * 60000),
      }];
    }

    // 2. Find nearby stops for both locations
    console.log('[Routing] Finding nearby stops...');
    const [fromStops, toStops] = await Promise.all([
      findBestNearbyStops(fromLocation.lat, fromLocation.lon, 15, 2500), // 2.5km radius, up to 15 stops
      findBestNearbyStops(toLocation.lat, toLocation.lon, 15, 2500),
    ]);

    if (fromStops.length === 0) {
      throw new Error(`Aucun arrêt trouvé près de ${fromLocation.shortAddress || fromLocation.displayName}. Rayon de recherche: 2.5km. Vérifiez que les données GTFS sont chargées.`);
    }
    if (toStops.length === 0) {
      throw new Error(`Aucun arrêt trouvé près de ${toLocation.shortAddress || toLocation.displayName}. Rayon de recherche: 2.5km. Vérifiez que les données GTFS sont chargées.`);
    }

    console.log(`[Routing] Found ${fromStops.length} from stops, ${toStops.length} to stops`);
    console.log(`[Routing] Closest from stop: ${fromStops[0].name} (${Math.round(fromStops[0].distance)}m)`);
    console.log(`[Routing] Closest to stop: ${toStops[0].name} (${Math.round(toStops[0].distance)}m)`);

    // 3. Try to find routes between nearby stops
    const allJourneys: JourneyResult[] = [];

    // Try combinations of nearby stops (max 5x5 = 25 combinations)
    for (const fromStop of fromStops.slice(0, 5)) {
      for (const toStop of toStops.slice(0, 5)) {
        try {
          // Find routes between these stops
          const routes = await findRoute(fromStop.id, toStop.id, departureTime);

          // Add walking segments to the beginning and end
          for (const route of routes) {
            // Calculate walking time to first stop
            const walkToStop = getWalkingTime(fromStop.distance);

            // Calculate walking time from last stop
            const walkFromStop = getWalkingTime(toStop.distance);

            // Create virtual stops for the locations
            const fromVirtualStop: Stop = {
              id: 'virtual_from',
              name: fromLocation.shortAddress || fromLocation.displayName,
              lat: fromLocation.lat,
              lon: fromLocation.lon,
              locationType: 0,
            };

            const toVirtualStop: Stop = {
              id: 'virtual_to',
              name: toLocation.shortAddress || toLocation.displayName,
              lat: toLocation.lat,
              lon: toLocation.lon,
              locationType: 0,
            };

            // Prepend walking segment to first stop
            const walkToSegment: RouteSegment = {
              type: 'walk',
              from: fromVirtualStop,
              to: fromStop,
              duration: walkToStop,
              distance: Math.round(fromStop.distance),
            };

            // Append walking segment from last stop
            const walkFromSegment: RouteSegment = {
              type: 'walk',
              from: toStop,
              to: toVirtualStop,
              duration: walkFromStop,
              distance: Math.round(toStop.distance),
            };

            // Create new journey with walking segments
            const newJourney: JourneyResult = {
              segments: [walkToSegment, ...route.segments, walkFromSegment],
              totalDuration: route.totalDuration + walkToStop + walkFromStop,
              totalWalkDistance: route.totalWalkDistance + Math.round(fromStop.distance) + Math.round(toStop.distance),
              numberOfTransfers: route.numberOfTransfers,
              departureTime: route.departureTime,
              arrivalTime: route.arrivalTime,
            };

            allJourneys.push(newJourney);
          }
        } catch (error) {
          // Continue trying other combinations
          console.log(`[Routing] No route found between ${fromStop.name} and ${toStop.name}`);
        }
      }
    }

    if (allJourneys.length === 0) {
      throw new Error('Aucun itinéraire trouvé entre ces deux adresses. Essayez des points plus proches des transports en commun.');
    }

    // Sort by duration and return top 5
    allJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    const topJourneys = allJourneys.slice(0, 5);

    console.log(`[Routing] Found ${topJourneys.length} journey options`);
    return topJourneys;
  } catch (error) {
    console.error('[Routing] Error finding route from locations:', error);
    throw error;
  }
}

/**
 * Find routes from address to address (with geocoding)
 * @param fromAddress - Starting address as string
 * @param toAddress - Destination address as string
 * @param departureTime - Departure time
 * @param countryCode - Optional country code for geocoding (e.g., 'fr')
 * @returns Array of journey results with walking segments to/from stops
 */
export async function findRouteFromAddresses(
  fromAddress: string,
  toAddress: string,
  departureTime: Date,
  countryCode?: string
): Promise<JourneyResult[]> {
  try {
    // 1. Geocode both addresses
    console.log('[Routing] Geocoding addresses...');
    const [fromResults, toResults] = await Promise.all([
      geocodeAddress(fromAddress, countryCode, 1),
      geocodeAddress(toAddress, countryCode, 1),
    ]);

    if (fromResults.length === 0) {
      throw new Error('Could not find starting address');
    }
    if (toResults.length === 0) {
      throw new Error('Could not find destination address');
    }

    const fromLocation = fromResults[0];
    const toLocation = toResults[0];

    console.log('[Routing] From:', fromLocation.displayName);
    console.log('[Routing] To:', toLocation.displayName);

    // 2. Calculate direct walking distance
    const directDistance = haversineDistance(
      fromLocation.lat,
      fromLocation.lon,
      toLocation.lat,
      toLocation.lon
    );

    console.log(`[Routing] Direct distance: ${Math.round(directDistance)}m (${Math.round(directDistance / 1000 * 10) / 10}km)`);

    // Create virtual stops for the addresses
    const fromVirtualStop: Stop = {
      id: 'virtual_from',
      name: fromLocation.shortAddress || fromLocation.displayName,
      lat: fromLocation.lat,
      lon: fromLocation.lon,
      locationType: 0,
    };

    const toVirtualStop: Stop = {
      id: 'virtual_to',
      name: toLocation.shortAddress || toLocation.displayName,
      lat: toLocation.lat,
      lon: toLocation.lon,
      locationType: 0,
    };

    const allJourneys: JourneyResult[] = [];

    // Always include walking option (useful even for long distances)
    const walkTime = walkingTime(directDistance);
    const walkingJourney: JourneyResult = {
      segments: [{
        type: 'walk',
        from: fromVirtualStop,
        to: toVirtualStop,
        duration: Math.round(walkTime),
        distance: Math.round(directDistance),
      }],
      totalDuration: Math.round(walkTime),
      totalWalkDistance: Math.round(directDistance),
      numberOfTransfers: 0,
      departureTime: departureTime,
      arrivalTime: new Date(departureTime.getTime() + walkTime * 60000),
    };
    allJourneys.push(walkingJourney);

    // If distance > 800m, also search for transit routes
    if (directDistance > 800) {
      console.log('[Routing] Distance > 800m, searching for transit routes...');

      // 3. Find nearby stops for both locations
      const [fromStops, toStops] = await Promise.all([
        findBestNearbyStops(fromLocation.lat, fromLocation.lon, 3, 2500), // Limit to 3 stops to reduce combinations
        findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500),
      ]);

      if (fromStops.length === 0 || toStops.length === 0) {
        console.log('[Routing] No nearby stops found, returning walking-only journey');
        return [walkingJourney];
      }

      console.log(`[Routing] Found ${fromStops.length} from stops, ${toStops.length} to stops`);
      console.log(`[Routing] Closest from stop: ${fromStops[0].name} (${Math.round(fromStops[0].distance)}m)`);
      console.log(`[Routing] Closest to stop: ${toStops[0].name} (${Math.round(toStops[0].distance)}m)`);

      // 4. Try to find routes between nearby stops (limit combinations to avoid duplicates)
      const transitJourneys: JourneyResult[] = [];
      const seenRouteKeys = new Set<string>();

      // Only try best 2 from-stops × best 2 to-stops = max 4 combinations
      for (const fromStop of fromStops.slice(0, 2)) {
        for (const toStop of toStops.slice(0, 2)) {
          try {
            // Find routes between these stops
            const routes = await findRoute(fromStop.id, toStop.id, departureTime);

            // Add walking segments to the beginning and end
            for (const route of routes) {
              // Create a unique key based on the transit lines used
              const routeKey = route.segments
                .filter(seg => seg.type === 'transit' && seg.route)
                .map(seg => seg.route!.id)
                .join('-');

              // Skip if we've already seen this combination of lines
              if (routeKey && seenRouteKeys.has(routeKey)) {
                continue;
              }
              seenRouteKeys.add(routeKey);

              // Calculate walking time to first stop
              const walkToStop = getWalkingTime(fromStop.distance);

              // Calculate walking time from last stop
              const walkFromStop = getWalkingTime(toStop.distance);

              // Prepend walking segment to first stop
              const walkToSegment: RouteSegment = {
                type: 'walk',
                from: fromVirtualStop,
                to: fromStop,
                duration: walkToStop,
                distance: Math.round(fromStop.distance),
              };

              // Append walking segment from last stop
              const walkFromSegment: RouteSegment = {
                type: 'walk',
                from: toStop,
                to: toVirtualStop,
                duration: walkFromStop,
                distance: Math.round(toStop.distance),
              };

              // Create new journey with walking segments
              const newJourney: JourneyResult = {
                segments: [walkToSegment, ...route.segments, walkFromSegment],
                totalDuration: route.totalDuration + walkToStop + walkFromStop,
                totalWalkDistance: route.totalWalkDistance + Math.round(fromStop.distance) + Math.round(toStop.distance),
                numberOfTransfers: route.numberOfTransfers,
                departureTime: departureTime,
                arrivalTime: new Date(departureTime.getTime() + (route.totalDuration + walkToStop + walkFromStop) * 60000),
              };

              transitJourneys.push(newJourney);
            }
          } catch (error) {
            // Skip this combination if route finding fails
            console.warn(`[Routing] Failed to find route between ${fromStop.name} and ${toStop.name}`);
          }
        }
      }

      // Sort transit journeys by duration and keep top 2
      transitJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
      allJourneys.push(...transitJourneys.slice(0, 2));
    }

    // Sort all journeys by total duration
    allJourneys.sort((a, b) => a.totalDuration - b.totalDuration);

    console.log(`[Routing] Found ${allJourneys.length} journey options`);

    return allJourneys;

  } catch (error) {
    console.error('[Routing] Error finding route from addresses:', error);
    throw error;
  }
}

/**
 * Find route from coordinates to address
 */
export async function findRouteFromCoordinates(
  fromLat: number,
  fromLon: number,
  toAddress: string,
  departureTime: Date,
  countryCode?: string
): Promise<JourneyResult[]> {
  try {
    // 1. Geocode destination address
    const toResults = await geocodeAddress(toAddress, countryCode, 1);
    if (toResults.length === 0) {
      throw new Error('Could not find destination address');
    }

    const toLocation = toResults[0];

    // 2. Find nearby stops from starting coordinates
    const fromStops = await findBestNearbyStops(fromLat, fromLon, 15, 2500);
    if (fromStops.length === 0) {
      throw new Error('Aucun arrêt trouvé près de votre position. Rayon de recherche: 2.5km.');
    }

    // 3. Find nearby stops for destination
    const toStops = await findBestNearbyStops(toLocation.lat, toLocation.lon, 15, 2500);
    if (toStops.length === 0) {
      throw new Error('No transit stops found near destination');
    }

    // 4. Find routes and add walking segments
    const allJourneys: JourneyResult[] = [];

    for (const fromStop of fromStops.slice(0, 5)) {
      for (const toStop of toStops.slice(0, 5)) {
        try {
          const routes = await findRoute(fromStop.id, toStop.id, departureTime);

          for (const route of routes) {
            const walkToStop = getWalkingTime(fromStop.distance);
            const walkFromStop = getWalkingTime(toStop.distance);

            const fromVirtualStop: Stop = {
              id: 'virtual_from',
              name: 'Current Location',
              lat: fromLat,
              lon: fromLon,
              locationType: 0,
            };

            const toVirtualStop: Stop = {
              id: 'virtual_to',
              name: toLocation.shortAddress || toLocation.displayName,
              lat: toLocation.lat,
              lon: toLocation.lon,
              locationType: 0,
            };

            const walkToSegment: RouteSegment = {
              type: 'walk',
              from: fromVirtualStop,
              to: fromStop,
              duration: walkToStop,
              distance: Math.round(fromStop.distance),
            };

            const walkFromSegment: RouteSegment = {
              type: 'walk',
              from: toStop,
              to: toVirtualStop,
              duration: walkFromStop,
              distance: Math.round(toStop.distance),
            };

            const newJourney: JourneyResult = {
              segments: [walkToSegment, ...route.segments, walkFromSegment],
              totalDuration: route.totalDuration + walkToStop + walkFromStop,
              totalWalkDistance: route.totalWalkDistance + Math.round(fromStop.distance) + Math.round(toStop.distance),
              numberOfTransfers: route.numberOfTransfers,
              departureTime: departureTime,
              arrivalTime: new Date(departureTime.getTime() + (route.totalDuration + walkToStop + walkFromStop) * 60000),
            };

            allJourneys.push(newJourney);
          }
        } catch (error) {
          console.warn(`[Routing] Failed to find route between stops`);
        }
      }
    }

    if (allJourneys.length === 0) {
      throw new Error('Aucun itinéraire trouvé');
    }

    allJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    console.log(`[Routing] Found ${allJourneys.length} journeys, returning top 5`);
    return allJourneys.slice(0, 5);

  } catch (error) {
    console.error('[Routing] Error finding route from coordinates:', error);
    throw error;
  }
}
