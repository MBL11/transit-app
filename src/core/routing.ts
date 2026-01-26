import Heap from 'heap-js';
import * as db from './database';
import { Stop, Route } from './types/models';
import { JourneyResult, RouteSegment } from './types/routing';
import { geocodeAddress, GeocodingResult } from './geocoding';
import { findBestNearbyStops, NearbyStop, getWalkingTime } from './nearby-stops';
import {
  RoutingPreferences,
  DEFAULT_PREFERENCES,
  isRouteTypeAllowed,
  meetsPreferences,
  scoreJourney,
  getJourneyTags,
} from '../types/routing-preferences';

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

  // 3. Algorithme : trouve les lignes directes d'abord
  const journeys: JourneyResult[] = [];

  // Récupère les routes qui passent par les deux arrêts
  const fromRoutes = await db.getRoutesByStopId(fromStopId);
  const toRoutes = await db.getRoutesByStopId(toStopId);

  // Trouve les routes communes (trajet direct)
  const fromRouteIds = new Set(fromRoutes.map(r => r.id));
  const directRoutes = toRoutes.filter(r => fromRouteIds.has(r.id));

  for (const route of directRoutes.slice(0, 3)) { // Max 3 itinéraires directs
    // Estime le temps de trajet basé sur la distance (simplifié)
    const distanceKm = directDistance / 1000;
    const estimatedDuration = Math.max(5, Math.round(distanceKm * 3)); // ~3 min per km

    // Try to get headsign for this route
    const tripInfo = await db.getTripInfoForRoute(route.id, toStopId);

    const journey: JourneyResult = {
      segments: [{
        type: 'transit',
        from: fromStop,
        to: toStop,
        route: route,
        trip: tripInfo ? { headsign: tripInfo.headsign } : undefined,
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

  // 4. Si pas de trajet direct, cherche avec une correspondance
  if (journeys.length === 0 && fromRoutes.length > 0 && toRoutes.length > 0) {
    console.log('[Routing] No direct route, looking for connections...');

    const toRouteIds = new Set(toRoutes.map(r => r.id));
    const transferJourneys: JourneyResult[] = [];

    // Pour chaque ligne de départ, trouve les arrêts de correspondance possibles
    for (const fromRoute of fromRoutes.slice(0, 3)) {
      // Récupère tous les arrêts de cette ligne
      const fromRouteStops = await db.getStopsByRouteId(fromRoute.id);

      // Pour chaque arrêt de cette ligne, vérifie s'il est desservi par une ligne d'arrivée
      for (const transferStop of fromRouteStops) {
        if (transferStop.id === fromStopId) continue; // Skip départ

        // Vérifie les routes qui passent par cet arrêt de correspondance
        let transferRoutes = await db.getRoutesByStopId(transferStop.id);
        let connectingRoutes = transferRoutes.filter(r => toRouteIds.has(r.id) && r.id !== fromRoute.id);

        // Si pas de connexion directe, cherche des arrêts proches (< 200m) pour les correspondances
        // Cela gère le cas où le même nom de station a des IDs différents par ligne
        let actualTransferStop = transferStop;
        if (connectingRoutes.length === 0) {
          const nearbyStops = await findBestNearbyStops(transferStop.lat, transferStop.lon, 5, 200);
          for (const nearbyStop of nearbyStops) {
            if (nearbyStop.id === transferStop.id) continue;
            const nearbyRoutes = await db.getRoutesByStopId(nearbyStop.id);
            const nearbyConnecting = nearbyRoutes.filter(r => toRouteIds.has(r.id) && r.id !== fromRoute.id);
            if (nearbyConnecting.length > 0) {
              connectingRoutes = nearbyConnecting;
              actualTransferStop = nearbyStop;
              break;
            }
          }
        }

        if (connectingRoutes.length > 0) {
          // Correspondance trouvée !
          const connectingRoute = connectingRoutes[0];

          // Calcul des durées
          const dist1 = haversineDistance(fromStop.lat, fromStop.lon, transferStop.lat, transferStop.lon);
          const dist2 = haversineDistance(actualTransferStop.lat, actualTransferStop.lon, toStop.lat, toStop.lon);
          const duration1 = Math.max(3, Math.round((dist1 / 1000) * 3));
          const duration2 = Math.max(3, Math.round((dist2 / 1000) * 3));
          const transferTime = 4; // 4 min pour la correspondance
          const totalDuration = duration1 + transferTime + duration2;

          // Get headsigns
          const trip1Info = await db.getTripInfoForRoute(fromRoute.id, transferStop.id);
          const trip2Info = await db.getTripInfoForRoute(connectingRoute.id, toStopId);

          // Utilise le nom de station pour l'affichage (même si les IDs sont différents)
          const transferStationName = transferStop.name;

          const journey: JourneyResult = {
            segments: [
              {
                type: 'transit',
                from: fromStop,
                to: { ...transferStop, name: transferStationName },
                route: fromRoute,
                trip: trip1Info ? { headsign: trip1Info.headsign } : undefined,
                departureTime: departureTime,
                arrivalTime: new Date(departureTime.getTime() + duration1 * 60000),
                duration: duration1,
              },
              {
                type: 'transit',
                from: { ...actualTransferStop, name: transferStationName },
                to: toStop,
                route: connectingRoute,
                trip: trip2Info ? { headsign: trip2Info.headsign } : undefined,
                departureTime: new Date(departureTime.getTime() + (duration1 + transferTime) * 60000),
                arrivalTime: new Date(departureTime.getTime() + totalDuration * 60000),
                duration: duration2,
              },
            ],
            totalDuration: totalDuration,
            totalWalkDistance: 0,
            numberOfTransfers: 1,
            departureTime: departureTime,
            arrivalTime: new Date(departureTime.getTime() + totalDuration * 60000),
          };

          transferJourneys.push(journey);

          // Limite le nombre de correspondances trouvées
          if (transferJourneys.length >= 5) break;
        }
      }
      if (transferJourneys.length >= 5) break;
    }

    // Trie par durée et garde les meilleurs
    transferJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    journeys.push(...transferJourneys.slice(0, 3));
  }

  // Si toujours pas de trajet, retourne un trajet à pied comme fallback
  if (journeys.length === 0) {
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

/**
 * Find multiple routes with filtering and preferences
 * Returns diverse route options optimized according to user preferences
 */
export async function findMultipleRoutes(
  from: GeocodingResult,
  to: GeocodingResult,
  departureTime: Date,
  preferences: RoutingPreferences = DEFAULT_PREFERENCES,
  maxRoutes: number = 3
): Promise<JourneyResult[]> {
  try {
    console.log('[Routing] Finding multiple routes with preferences:', preferences.optimizeFor);

    // 1. Get base routes using findRouteFromLocations
    const baseRoutes = await findRouteFromLocations(from, to, departureTime);

    if (baseRoutes.length === 0) {
      return [];
    }

    console.log(`[Routing] Found ${baseRoutes.length} base routes`);

    // 2. Separate walking-only routes from transit routes
    const walkingOnlyRoutes = baseRoutes.filter((journey) =>
      journey.segments.every((seg) => seg.type === 'walk')
    );
    const transitRoutes = baseRoutes.filter((journey) =>
      journey.segments.some((seg) => seg.type === 'transit')
    );

    // 3. Filter transit routes based on preferences
    let filteredTransitRoutes = transitRoutes.filter((journey) => {
      // Check if route meets basic preferences (transfers, walking distance)
      if (!meetsPreferences(journey, preferences)) {
        return false;
      }

      // Check if all transit segments use allowed modes
      const hasDisallowedMode = journey.segments.some((segment) => {
        if (segment.type === 'transit' && segment.route) {
          return !isRouteTypeAllowed(segment.route.type, preferences);
        }
        return false;
      });

      return !hasDisallowedMode;
    });

    console.log(`[Routing] After filtering transit: ${filteredTransitRoutes.length} routes`);

    // 4. Combine filtered transit routes with walking routes
    // Always include walking option as it's a valid alternative
    let allRoutes = [...filteredTransitRoutes];

    // Add walking route if walking is allowed
    if (preferences.allowedModes.walking && walkingOnlyRoutes.length > 0) {
      allRoutes.push(walkingOnlyRoutes[0]);
    }

    // 5. If no routes after filtering, return the best base route anyway
    if (allRoutes.length === 0) {
      console.warn('[Routing] No routes meet preferences, returning best available route');
      return baseRoutes.slice(0, 1);
    }

    // 6. Score routes based on optimization preference
    const scoredRoutes = allRoutes.map((journey) => ({
      journey,
      score: scoreJourney(journey, preferences),
    }));

    // 7. Sort by score (higher is better)
    scoredRoutes.sort((a, b) => b.score - a.score);

    // 8. Take top routes
    const topRoutes = scoredRoutes.slice(0, maxRoutes).map((r) => r.journey);

    // 9. Add tags to routes
    const routesWithTags = topRoutes.map((journey) => ({
      ...journey,
      tags: getJourneyTags(journey, topRoutes),
    }));

    console.log(`[Routing] Returning ${routesWithTags.length} optimized routes`);

    return routesWithTags;
  } catch (error) {
    console.error('[Routing] Error finding multiple routes:', error);
    throw error;
  }
}

/**
 * Find multiple routes from addresses (with geocoding)
 */
export async function findMultipleRoutesFromAddresses(
  fromAddress: string,
  toAddress: string,
  departureTime: Date,
  preferences: RoutingPreferences = DEFAULT_PREFERENCES,
  countryCode?: string,
  maxRoutes: number = 3
): Promise<JourneyResult[]> {
  try {
    console.log('[Routing] Finding multiple routes from addresses with geocoding');

    // 1. Geocode both addresses
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

    // 2. Use findMultipleRoutes with the geocoded locations
    return await findMultipleRoutes(
      fromLocation,
      toLocation,
      departureTime,
      preferences,
      maxRoutes
    );
  } catch (error) {
    console.error('[Routing] Error finding multiple routes from addresses:', error);
    throw error;
  }
}
