import Heap from 'heap-js';
import * as db from './database';
import { Stop, Route } from './types/models';
import { JourneyResult, RouteSegment } from './types/routing';
import { geocodeAddress, GeocodingResult } from './geocoding';
import { findBestNearbyStops, NearbyStop, getWalkingTime } from './nearby-stops';
import { logger } from '../utils/logger';
import { captureException } from '../services/crash-reporting';
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

/**
 * Get transit speed estimate in minutes per kilometer based on transport mode.
 * Calibrated against real İzmir transit data:
 *   Metro M1: Fahrettin Altay→Konak ~6km in ~10min → 1.7 min/km
 *   İZBAN: Aliağa→Cumaovası ~80km in ~90min → 1.1 min/km
 *   Tram T1: Alaybey→Ataşehir ~4km in ~15min → 3.8 min/km
 *   Bus: city average ~18-20 km/h → 3.0-3.3 min/km
 *   Ferry: Konak→Karşıyaka ~5km in ~20min → 4.0 min/km
 */
function getTransitMinPerKm(routeType: number): number {
  switch (routeType) {
    case 1: return 1.7;  // Metro (~35 km/h avg with stops)
    case 2: return 1.3;  // İZBAN / commuter rail (~46 km/h avg)
    case 0: return 3.5;  // Tram (~17 km/h avg)
    case 3: return 3.0;  // Bus (~20 km/h avg in city)
    case 4: return 3.5;  // Ferry (~17 km/h avg incl. docking)
    default: return 3.0; // Unknown → bus-like estimate
  }
}

/**
 * Estimate average wait time at a stop (half the typical headway).
 * During peak hours, headways are shorter; off-peak they're longer.
 * These are rough averages for İzmir.
 */
function getAverageWaitTime(routeType: number): number {
  switch (routeType) {
    case 1: return 3;   // Metro: ~6 min headway → 3 min avg wait
    case 2: return 5;   // İZBAN: ~10 min headway → 5 min avg wait
    case 0: return 4;   // Tram: ~8 min headway → 4 min avg wait
    case 3: return 5;   // Bus: ~10 min headway → 5 min avg wait
    case 4: return 8;   // Ferry: ~15-20 min headway → 8 min avg wait
    default: return 5;
  }
}

/**
 * Estimate dwell time per intermediate stop (boarding/alighting).
 * Adds up across all stops on the segment to improve accuracy.
 */
function getDwellTimePerStop(routeType: number): number {
  switch (routeType) {
    case 1: return 0.5;  // Metro: 30s per stop
    case 2: return 0.5;  // İZBAN: 30s per stop
    case 0: return 0.4;  // Tram: ~25s per stop
    case 3: return 0.5;  // Bus: 30s per stop (varies with passengers)
    case 4: return 1.0;  // Ferry: ~1 min per dock (limited stops)
    default: return 0.5;
  }
}

/**
 * Estimate number of intermediate stops between two points on a route.
 * Uses average inter-station distances per mode.
 */
function estimateIntermediateStops(distanceKm: number, routeType: number): number {
  // Average distance between stops in km by mode
  const avgInterStopKm: Record<number, number> = {
    1: 0.9,   // Metro: ~900m between stations
    2: 2.5,   // İZBAN: ~2.5km between stations
    0: 0.5,   // Tram: ~500m between stops
    3: 0.4,   // Bus: ~400m between stops
    4: 5.0,   // Ferry: ~5km between docks
  };
  const avgKm = avgInterStopKm[routeType] || 0.5;
  return Math.max(0, Math.round(distanceKm / avgKm) - 1);
}

// Transfer penalty: platform walking + waiting for next vehicle
const TRANSFER_PENALTY_MIN = 5; // 5 min (was 4): walk between platforms + wait

// Parse "HH:MM:SS" en minutes depuis minuit
function parseGtfsTime(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 60 + m + s / 60;
}

// Maximum reasonable journey duration in minutes (3 hours)
const MAX_JOURNEY_DURATION_MIN = 180;
// Maximum walking-only duration in minutes (1 hour = ~5km)
const MAX_WALKING_DURATION_MIN = 60;
// Transfer search radius in meters (bus stops can be 300-500m from rail stations in İzmir)
const TRANSFER_SEARCH_RADIUS_M = 500;

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
  const fromRoutes = await db.getRoutesByStopId(fromStopId, true);
  const toRoutes = await db.getRoutesByStopId(toStopId, true);

  // Trouve les routes communes (trajet direct)
  const fromRouteIds = new Set(fromRoutes.map(r => r.id));
  const directRoutes = toRoutes.filter(r => fromRouteIds.has(r.id));

  for (const route of directRoutes.slice(0, 3)) { // Max 3 itinéraires directs
    // Try to get actual travel time from GTFS stop_times first
    const actualTime = db.getActualTravelTime(route.id, fromStopId, toStopId);

    let estimatedDuration: number;
    if (actualTime !== null) {
      // Real GTFS schedule data available — add wait time only
      const waitTime = getAverageWaitTime(route.type);
      estimatedDuration = Math.max(3, actualTime + waitTime);
    } else {
      // Fallback: estimate based on distance and transport mode
      const distanceKm = directDistance / 1000;
      const minPerKm = getTransitMinPerKm(route.type);
      const travelTime = distanceKm * minPerKm;
      const intermediateStops = estimateIntermediateStops(distanceKm, route.type);
      const dwellTime = intermediateStops * getDwellTimePerStop(route.type);
      const waitTime = getAverageWaitTime(route.type);
      estimatedDuration = Math.max(3, Math.round(travelTime + dwellTime + waitTime));
    }

    // Try to get headsign for this route (pass both origin and destination for correct direction)
    const tripInfo = await db.getTripInfoForRoute(route.id, toStopId, fromStopId);

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
    logger.log('[Routing] No direct route, looking for connections...');

    const toRouteIds = new Set(toRoutes.map(r => r.id));
    const transferJourneys: JourneyResult[] = [];

    // Pour chaque ligne de départ, trouve les arrêts de correspondance possibles
    for (const fromRoute of fromRoutes.slice(0, 5)) {
      // Récupère tous les arrêts de cette ligne
      const fromRouteStops = await db.getStopsByRouteId(fromRoute.id);

      // Pour chaque arrêt de cette ligne, vérifie s'il est desservi par une ligne d'arrivée
      for (const transferStop of fromRouteStops) {
        if (transferStop.id === fromStopId) continue; // Skip départ

        // Vérifie les routes qui passent par cet arrêt de correspondance
        let transferRoutes = await db.getRoutesByStopId(transferStop.id, true);
        let connectingRoutes = transferRoutes.filter(r => toRouteIds.has(r.id) && r.id !== fromRoute.id);

        // Si pas de connexion directe, cherche des arrêts proches pour les correspondances
        // Bus stops can be 300-500m from metro/tram/İZBAN stations in İzmir
        let actualTransferStop = transferStop;
        if (connectingRoutes.length === 0) {
          const nearbyStops = await findBestNearbyStops(transferStop.lat, transferStop.lon, 10, TRANSFER_SEARCH_RADIUS_M);
          for (const nearbyStop of nearbyStops) {
            if (nearbyStop.id === transferStop.id) continue;
            const nearbyRoutes = await db.getRoutesByStopId(nearbyStop.id, true);
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

          // Try real GTFS times first, fallback to estimates
          const actual1 = db.getActualTravelTime(fromRoute.id, fromStopId, transferStop.id);
          const actual2 = db.getActualTravelTime(connectingRoute.id, actualTransferStop.id, toStopId);

          let duration1: number;
          if (actual1 !== null) {
            duration1 = Math.max(3, actual1 + getAverageWaitTime(fromRoute.type));
          } else {
            const dist1Km = haversineDistance(fromStop.lat, fromStop.lon, transferStop.lat, transferStop.lon) / 1000;
            const travel1 = dist1Km * getTransitMinPerKm(fromRoute.type);
            const dwell1 = estimateIntermediateStops(dist1Km, fromRoute.type) * getDwellTimePerStop(fromRoute.type);
            duration1 = Math.max(3, Math.round(travel1 + dwell1 + getAverageWaitTime(fromRoute.type)));
          }

          let duration2: number;
          if (actual2 !== null) {
            duration2 = Math.max(3, actual2);
          } else {
            const dist2Km = haversineDistance(actualTransferStop.lat, actualTransferStop.lon, toStop.lat, toStop.lon) / 1000;
            const travel2 = dist2Km * getTransitMinPerKm(connectingRoute.type);
            const dwell2 = estimateIntermediateStops(dist2Km, connectingRoute.type) * getDwellTimePerStop(connectingRoute.type);
            duration2 = Math.max(3, Math.round(travel2 + dwell2));
          }

          const transferTime = TRANSFER_PENALTY_MIN;
          const totalDuration = duration1 + transferTime + duration2;

          // Get headsigns (pass origin and destination for correct direction)
          const trip1Info = await db.getTripInfoForRoute(fromRoute.id, transferStop.id, fromStopId);
          const trip2Info = await db.getTripInfoForRoute(connectingRoute.id, toStopId, transferStop.id);

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

  // 5. Si toujours pas de trajet, cherche avec 2 correspondances (A → B → C → D)
  if (journeys.length === 0 && fromRoutes.length > 0 && toRoutes.length > 0) {
    logger.log('[Routing] No 1-transfer route, looking for 2-transfer connections...');

    const toRouteIds = new Set(toRoutes.map(r => r.id));
    const twoTransferJourneys: JourneyResult[] = [];

    // For each departure route, find its stops and look for intermediate connections
    for (const fromRoute of fromRoutes.slice(0, 3)) {
      const fromRouteStops = await db.getStopsByRouteId(fromRoute.id);

      for (const midStop1 of fromRouteStops) {
        if (midStop1.id === fromStopId) continue;

        // Get routes at first transfer point
        let midRoutes1 = await db.getRoutesByStopId(midStop1.id, true);
        midRoutes1 = midRoutes1.filter(r => r.id !== fromRoute.id);

        for (const midRoute of midRoutes1.slice(0, 3)) {
          // Get stops on the intermediate route
          const midRouteStops = await db.getStopsByRouteId(midRoute.id);

          for (const midStop2 of midRouteStops) {
            if (midStop2.id === midStop1.id) continue;

            // Check if any route from midStop2 reaches the destination
            let midRoutes2 = await db.getRoutesByStopId(midStop2.id, true);
            const finalRoutes = midRoutes2.filter(r => toRouteIds.has(r.id) && r.id !== midRoute.id);

            // Also check nearby stops for the second transfer
            let actualMidStop2 = midStop2;
            if (finalRoutes.length === 0) {
              const nearbyStops = await findBestNearbyStops(midStop2.lat, midStop2.lon, 5, TRANSFER_SEARCH_RADIUS_M);
              for (const ns of nearbyStops) {
                if (ns.id === midStop2.id) continue;
                const nsRoutes = await db.getRoutesByStopId(ns.id, true);
                const nsConnecting = nsRoutes.filter(r => toRouteIds.has(r.id) && r.id !== midRoute.id);
                if (nsConnecting.length > 0) {
                  finalRoutes.push(...nsConnecting);
                  actualMidStop2 = ns;
                  break;
                }
              }
            }

            if (finalRoutes.length > 0) {
              const finalRoute = finalRoutes[0];

              // Try real GTFS times first, fallback to distance estimates
              const actual1 = db.getActualTravelTime(fromRoute.id, fromStopId, midStop1.id);
              const actual2 = db.getActualTravelTime(midRoute.id, midStop1.id, midStop2.id);
              const actual3 = db.getActualTravelTime(finalRoute.id, actualMidStop2.id, toStopId);

              const dur1 = actual1 !== null
                ? Math.max(3, actual1 + getAverageWaitTime(fromRoute.type))
                : Math.max(3, Math.round(
                    haversineDistance(fromStop.lat, fromStop.lon, midStop1.lat, midStop1.lon) / 1000 * getTransitMinPerKm(fromRoute.type) +
                    estimateIntermediateStops(haversineDistance(fromStop.lat, fromStop.lon, midStop1.lat, midStop1.lon) / 1000, fromRoute.type) * getDwellTimePerStop(fromRoute.type) +
                    getAverageWaitTime(fromRoute.type)
                  ));
              const dur2 = actual2 !== null
                ? Math.max(3, actual2)
                : Math.max(3, Math.round(
                    haversineDistance(midStop1.lat, midStop1.lon, midStop2.lat, midStop2.lon) / 1000 * getTransitMinPerKm(midRoute.type) +
                    estimateIntermediateStops(haversineDistance(midStop1.lat, midStop1.lon, midStop2.lat, midStop2.lon) / 1000, midRoute.type) * getDwellTimePerStop(midRoute.type)
                  ));
              const dur3 = actual3 !== null
                ? Math.max(3, actual3)
                : Math.max(3, Math.round(
                    haversineDistance(actualMidStop2.lat, actualMidStop2.lon, toStop.lat, toStop.lon) / 1000 * getTransitMinPerKm(finalRoute.type) +
                    estimateIntermediateStops(haversineDistance(actualMidStop2.lat, actualMidStop2.lon, toStop.lat, toStop.lon) / 1000, finalRoute.type) * getDwellTimePerStop(finalRoute.type)
                  ));
              const totalDuration = dur1 + TRANSFER_PENALTY_MIN + dur2 + TRANSFER_PENALTY_MIN + dur3;

              const trip1Info = await db.getTripInfoForRoute(fromRoute.id, midStop1.id, fromStopId);
              const trip2Info = await db.getTripInfoForRoute(midRoute.id, midStop2.id, midStop1.id);
              const trip3Info = await db.getTripInfoForRoute(finalRoute.id, toStopId, midStop2.id);

              const journey: JourneyResult = {
                segments: [
                  {
                    type: 'transit',
                    from: fromStop,
                    to: midStop1,
                    route: fromRoute,
                    trip: trip1Info ? { headsign: trip1Info.headsign } : undefined,
                    departureTime: departureTime,
                    arrivalTime: new Date(departureTime.getTime() + dur1 * 60000),
                    duration: dur1,
                  },
                  {
                    type: 'transit',
                    from: midStop1,
                    to: actualMidStop2,
                    route: midRoute,
                    trip: trip2Info ? { headsign: trip2Info.headsign } : undefined,
                    departureTime: new Date(departureTime.getTime() + (dur1 + TRANSFER_PENALTY_MIN) * 60000),
                    arrivalTime: new Date(departureTime.getTime() + (dur1 + TRANSFER_PENALTY_MIN + dur2) * 60000),
                    duration: dur2,
                  },
                  {
                    type: 'transit',
                    from: actualMidStop2,
                    to: toStop,
                    route: finalRoute,
                    trip: trip3Info ? { headsign: trip3Info.headsign } : undefined,
                    departureTime: new Date(departureTime.getTime() + (dur1 + TRANSFER_PENALTY_MIN + dur2 + TRANSFER_PENALTY_MIN) * 60000),
                    arrivalTime: new Date(departureTime.getTime() + totalDuration * 60000),
                    duration: dur3,
                  },
                ],
                totalDuration: totalDuration,
                totalWalkDistance: 0,
                numberOfTransfers: 2,
                departureTime: departureTime,
                arrivalTime: new Date(departureTime.getTime() + totalDuration * 60000),
              };

              twoTransferJourneys.push(journey);
              if (twoTransferJourneys.length >= 3) break;
            }
          }
          if (twoTransferJourneys.length >= 3) break;
        }
        if (twoTransferJourneys.length >= 3) break;
      }
      if (twoTransferJourneys.length >= 3) break;
    }

    if (twoTransferJourneys.length > 0) {
      twoTransferJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
      journeys.push(...twoTransferJourneys.slice(0, 2));
      logger.log(`[Routing] Found ${twoTransferJourneys.length} 2-transfer routes`);
    }
  }

  // Filter out journeys with absurd durations (coordinate errors can cause 40+ hour estimates)
  const validJourneys = journeys.filter(j => j.totalDuration <= MAX_JOURNEY_DURATION_MIN);

  // Si toujours pas de trajet, retourne un trajet à pied comme fallback (only if reasonable)
  if (validJourneys.length === 0) {
    const walkTime = walkingTime(directDistance);
    if (Math.round(walkTime) <= MAX_WALKING_DURATION_MIN) {
      validJourneys.push({
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
    } else {
      logger.warn(`[Routing] Walking fallback too long (${Math.round(walkTime)} min), distance=${Math.round(directDistance)}m — likely coordinate error`);
    }
  }

  return validJourneys;
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
    logger.log('[Routing] From:', fromLocation.displayName || fromLocation.shortAddress);
    logger.log('[Routing] To:', toLocation.displayName || toLocation.shortAddress);

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
    logger.log('[Routing] Finding nearby stops...');
    const [fromStops, toStops] = await Promise.all([
      findBestNearbyStops(fromLocation.lat, fromLocation.lon, 15, 2500), // 2.5km radius, up to 15 stops
      findBestNearbyStops(toLocation.lat, toLocation.lon, 15, 2500),
    ]);

    if (fromStops.length === 0) {
      throw new Error(`NO_STOPS_NEAR:${fromLocation.shortAddress || fromLocation.displayName}`);
    }
    if (toStops.length === 0) {
      throw new Error(`NO_STOPS_NEAR:${toLocation.shortAddress || toLocation.displayName}`);
    }

    logger.log(`[Routing] Found ${fromStops.length} from stops, ${toStops.length} to stops`);
    logger.log(`[Routing] Closest from stop: ${fromStops[0].name} (${Math.round(fromStops[0].distance)}m)`);
    logger.log(`[Routing] Closest to stop: ${toStops[0].name} (${Math.round(toStops[0].distance)}m)`);

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
          logger.log(`[Routing] No route found between ${fromStop.name} and ${toStop.name}`);
        }
      }
    }

    // Filter out absurd durations
    const validJourneys = allJourneys.filter(j => j.totalDuration <= MAX_JOURNEY_DURATION_MIN);

    if (validJourneys.length === 0) {
      throw new Error('NO_ROUTE_FOUND');
    }

    // Sort by duration and return top 5
    validJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    const topJourneys = validJourneys.slice(0, 5);

    logger.log(`[Routing] Found ${topJourneys.length} journey options`);
    return topJourneys;
  } catch (error) {
    logger.error('[Routing] Error finding route from locations:', error);
    captureException(error, { tags: { module: 'routing', action: 'find_route_from_locations' } });
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
    logger.log('[Routing] Geocoding addresses...');
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

    logger.log('[Routing] From:', fromLocation.displayName);
    logger.log('[Routing] To:', toLocation.displayName);

    // 2. Calculate direct walking distance
    const directDistance = haversineDistance(
      fromLocation.lat,
      fromLocation.lon,
      toLocation.lat,
      toLocation.lon
    );

    logger.log(`[Routing] Direct distance: ${Math.round(directDistance)}m (${Math.round(directDistance / 1000 * 10) / 10}km)`);

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

    // Include walking option only if reasonable (< 1 hour)
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
    if (Math.round(walkTime) <= MAX_WALKING_DURATION_MIN) {
      allJourneys.push(walkingJourney);
    }

    // If distance > 800m, also search for transit routes
    if (directDistance > 800) {
      logger.log('[Routing] Distance > 800m, searching for transit routes...');

      // 3. Find nearby stops for both locations
      // Use more stops (5) to ensure we find the truly closest stations
      const [fromStops, toStops] = await Promise.all([
        findBestNearbyStops(fromLocation.lat, fromLocation.lon, 5, 2500),
        findBestNearbyStops(toLocation.lat, toLocation.lon, 5, 2500),
      ]);

      if (fromStops.length === 0 || toStops.length === 0) {
        logger.log('[Routing] No nearby stops found, returning walking-only journey');
        return [walkingJourney];
      }

      logger.log(`[Routing] Found ${fromStops.length} from stops, ${toStops.length} to stops`);
      logger.log(`[Routing] Closest from stop: ${fromStops[0].name} (${Math.round(fromStops[0].distance)}m)`);
      logger.log(`[Routing] Closest to stop: ${toStops[0].name} (${Math.round(toStops[0].distance)}m)`);

      // 4. Try to find routes between nearby stops
      // OPTIMIZED: Run all combinations in parallel using Promise.all
      // Use ALL 5 stations from each side (5×5=25 combinations) to find the truly fastest route
      // Not just the closest stations, but also stations with better line connections
      const combinations: { fromStop: NearbyStop; toStop: NearbyStop }[] = [];
      for (const fromStop of fromStops) {
        for (const toStop of toStops) {
          combinations.push({ fromStop, toStop });
        }
      }

      logger.log(`[Routing] Calculating ${combinations.length} route combinations in parallel`);

      // Execute all route calculations in parallel
      const routeResults = await Promise.all(
        combinations.map(async ({ fromStop, toStop }) => {
          try {
            const routes = await findRoute(fromStop.id, toStop.id, departureTime);
            return { fromStop, toStop, routes };
          } catch (error) {
            logger.warn(`[Routing] Failed to find route between ${fromStop.name} and ${toStop.name}`);
            return { fromStop, toStop, routes: [] };
          }
        })
      );

      // Process results and deduplicate
      const transitJourneys: JourneyResult[] = [];
      const seenRouteKeys = new Set<string>();

      for (const { fromStop, toStop, routes } of routeResults) {
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
      }

      // Filter out absurd durations and sort by duration, keep top 2
      const validTransitJourneys = transitJourneys.filter(j => j.totalDuration <= MAX_JOURNEY_DURATION_MIN);
      validTransitJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
      allJourneys.push(...validTransitJourneys.slice(0, 2));
    }

    // Sort all journeys by total duration
    allJourneys.sort((a, b) => a.totalDuration - b.totalDuration);

    logger.log(`[Routing] Found ${allJourneys.length} journey options`);

    if (allJourneys.length === 0) {
      throw new Error('NO_ROUTE_FOUND');
    }

    return allJourneys;

  } catch (error) {
    logger.error('[Routing] Error finding route from addresses:', error);
    captureException(error, { tags: { module: 'routing', action: 'find_route_from_addresses' } });
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
      throw new Error('NO_STOPS_NEAR_POSITION');
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
          logger.warn(`[Routing] Failed to find route between stops`);
        }
      }
    }

    // Filter out absurd durations
    const validJourneys = allJourneys.filter(j => j.totalDuration <= MAX_JOURNEY_DURATION_MIN);

    if (validJourneys.length === 0) {
      throw new Error('NO_ROUTE_FOUND');
    }

    validJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    logger.log(`[Routing] Found ${validJourneys.length} journeys, returning top 5`);
    return validJourneys.slice(0, 5);

  } catch (error) {
    logger.error('[Routing] Error finding route from coordinates:', error);
    captureException(error, { tags: { module: 'routing', action: 'find_route_from_coordinates' } });
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
    logger.log('[Routing] Finding multiple routes with preferences:', preferences.optimizeFor);

    // 1. Get base routes using findRouteFromLocations
    const baseRoutes = await findRouteFromLocations(from, to, departureTime);

    if (baseRoutes.length === 0) {
      return [];
    }

    logger.log(`[Routing] Found ${baseRoutes.length} base routes`);

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

    logger.log(`[Routing] After filtering transit: ${filteredTransitRoutes.length} routes`);

    // 4. Combine filtered transit routes with walking routes
    // Always include walking option as it's a valid alternative
    let allRoutes = [...filteredTransitRoutes];

    // Add walking route if walking is allowed
    if (preferences.allowedModes.walking && walkingOnlyRoutes.length > 0) {
      allRoutes.push(walkingOnlyRoutes[0]);
    }

    // 5. If no routes after filtering, return the best base route anyway
    if (allRoutes.length === 0) {
      logger.warn('[Routing] No routes meet preferences, returning best available route');
      return baseRoutes.slice(0, 1);
    }

    // 6. Score routes based on optimization preference
    const scoredRoutes = allRoutes.map((journey) => ({
      journey,
      score: scoreJourney(journey, preferences),
      isWalkOnly: journey.segments.every((seg) => seg.type === 'walk'),
    }));

    // 7. Sort by score (higher is better)
    // Walking-only routes go after transit routes unless they're the fastest
    scoredRoutes.sort((a, b) => {
      // If one is walk-only and the other isn't, walk-only goes last
      // UNLESS it has a shorter total duration (it's genuinely faster)
      if (a.isWalkOnly !== b.isWalkOnly) {
        const walkRoute = a.isWalkOnly ? a : b;
        const transitRoute = a.isWalkOnly ? b : a;
        if (walkRoute.journey.totalDuration <= transitRoute.journey.totalDuration) {
          // Walking is faster or equal - let score decide
          return b.score - a.score;
        }
        // Transit is faster - transit goes first
        return a.isWalkOnly ? 1 : -1;
      }
      return b.score - a.score;
    });

    // 8. Take top routes
    const topRoutes = scoredRoutes.slice(0, maxRoutes).map((r) => r.journey);

    // 9. Add tags to routes
    const routesWithTags = topRoutes.map((journey) => ({
      ...journey,
      tags: getJourneyTags(journey, topRoutes),
    }));

    logger.log(`[Routing] Returning ${routesWithTags.length} optimized routes`);

    return routesWithTags;
  } catch (error) {
    logger.error('[Routing] Error finding multiple routes:', error);
    captureException(error, { tags: { module: 'routing', action: 'find_multiple_routes' } });
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
    logger.log('[Routing] Finding multiple routes from addresses with geocoding');

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
    logger.error('[Routing] Error finding multiple routes from addresses:', error);
    captureException(error, { tags: { module: 'routing', action: 'find_multiple_routes_from_addresses' } });
    throw error;
  }
}
