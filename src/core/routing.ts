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

/**
 * Cache for stop and route lookups to avoid redundant DB queries
 * across multiple findRoute combinations (3×3 = 9 calls share the same stops)
 */
interface RoutingCache {
  stops: Map<string, Stop | null>;
  routes: Map<string, Route[]>;
}

function createRoutingCache(): RoutingCache {
  return { stops: new Map(), routes: new Map() };
}

async function getCachedStop(id: string, cache?: RoutingCache): Promise<Stop | null> {
  if (cache?.stops.has(id)) return cache.stops.get(id)!;
  const stop = await db.getStopById(id);
  if (cache) cache.stops.set(id, stop);
  return stop;
}

async function getCachedRoutes(stopId: string, cache?: RoutingCache): Promise<Route[]> {
  if (cache?.routes.has(stopId)) return cache.routes.get(stopId)!;
  const routes = await db.getRoutesByStopId(stopId, true);
  if (cache) cache.routes.set(stopId, routes);
  return routes;
}

/**
 * Post-process journeys to add headsign info (skipped during search for speed)
 */
async function enrichWithHeadsigns(journeys: JourneyResult[]): Promise<void> {
  for (const journey of journeys) {
    for (const segment of journey.segments) {
      if (segment.type === 'transit' && segment.route && !segment.trip) {
        const tripInfo = await db.getTripInfoForRoute(
          segment.route.id,
          segment.to.id,
          segment.from.id
        );
        if (tripInfo) {
          segment.trip = { headsign: tripInfo.headsign } as any;
        }
      }
    }
  }
}

export async function findRoute(
  fromStopId: string,
  toStopId: string,
  departureTime: Date,
  cache?: RoutingCache
): Promise<JourneyResult[]> {

  // 1. Charge les stops (using cache to avoid redundant queries)
  const fromStop = await getCachedStop(fromStopId, cache);
  const toStop = await getCachedStop(toStopId, cache);

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

  // Get active service IDs for this date and time in minutes
  const activeServiceIds = db.getActiveServiceIds(departureTime);
  const requestedTimeMinutes = departureTime.getHours() * 60 + departureTime.getMinutes();

  // Récupère les routes qui passent par les deux arrêts (using cache)
  // Cap at 10 routes per stop to prevent huge transfer queries
  const MAX_ROUTES_PER_STOP = 10;
  const fromRoutesRaw = await getCachedRoutes(fromStopId, cache);
  const toRoutesRaw = await getCachedRoutes(toStopId, cache);
  const fromRoutes = fromRoutesRaw.slice(0, MAX_ROUTES_PER_STOP);
  const toRoutes = toRoutesRaw.slice(0, MAX_ROUTES_PER_STOP);

  // Trouve les routes communes (trajet direct)
  const fromRouteIds = new Set(fromRoutes.map(r => r.id));
  const directRoutes = toRoutes.filter(r => fromRouteIds.has(r.id));

  if (directRoutes.length > 0) {
    logger.log(`[Routing] Direct route found: ${directRoutes.map(r => r.shortName).join(', ')} (${fromStop.name} → ${toStop.name})`);
  }

  // Check if we're in night hours (1 AM - 5 AM) - only buses run at night in İzmir
  const isNightHours = requestedTimeMinutes >= 60 && requestedTimeMinutes < 300; // 1:00 - 5:00

  for (const route of directRoutes.slice(0, 5)) { // Check more routes since some may have no service
    // During night hours, skip non-bus routes (trams, metro, ferries don't run 1-5 AM)
    // Route types: 0=tram, 1=metro, 2=rail, 3=bus, 4=ferry
    if (isNightHours && route.type !== 3) {
      logger.log(`[Routing] Skipping ${route.shortName} (type ${route.type}): non-bus routes don't run at night`);
      continue;
    }

    // Check if this route has a departure around the requested time (60 min for night buses)
    const nextDepartureMin = db.getNextDepartureForRoute(
      route.id,
      fromStopId,
      requestedTimeMinutes,
      activeServiceIds,
      60 // 60 min window to catch less frequent night buses
    );

    if (nextDepartureMin === null) {
      // No departures for this route at this time
      logger.log(`[Routing] Skipping ${route.shortName}: no service at ${Math.floor(requestedTimeMinutes / 60)}:${(requestedTimeMinutes % 60).toString().padStart(2, '0')}`);
      continue;
    }

    // Calculate actual departure time from minutes since midnight
    const actualDepartureTime = new Date(departureTime);
    actualDepartureTime.setHours(Math.floor(nextDepartureMin / 60), Math.round(nextDepartureMin % 60), 0, 0);

    // Try to get actual travel time from GTFS stop_times first
    const actualTime = db.getActualTravelTime(route.id, fromStopId, toStopId);

    let estimatedDuration: number;
    if (actualTime !== null) {
      // Real GTFS schedule data available
      estimatedDuration = Math.max(3, actualTime);
    } else {
      // Fallback: estimate based on distance and transport mode
      const distanceKm = directDistance / 1000;
      const minPerKm = getTransitMinPerKm(route.type);
      const travelTime = distanceKm * minPerKm;
      const intermediateStops = estimateIntermediateStops(distanceKm, route.type);
      const dwellTime = intermediateStops * getDwellTimePerStop(route.type);
      estimatedDuration = Math.max(3, Math.round(travelTime + dwellTime));
    }

    // Headsign lookup deferred to enrichWithHeadsigns() for performance

    const journey: JourneyResult = {
      segments: [{
        type: 'transit',
        from: fromStop,
        to: toStop,
        route: route,
        departureTime: actualDepartureTime,
        arrivalTime: new Date(actualDepartureTime.getTime() + estimatedDuration * 60000),
        duration: estimatedDuration,
      }],
      totalDuration: estimatedDuration,
      totalWalkDistance: 0,
      numberOfTransfers: 0,
      departureTime: actualDepartureTime,
      arrivalTime: new Date(actualDepartureTime.getTime() + estimatedDuration * 60000),
    };

    journeys.push(journey);

    // Stop after finding 3 valid routes
    if (journeys.length >= 3) break;
  }

  // 4. Si pas de trajet direct, cherche avec une correspondance
  //    Uses batch SQL query to find transfer points instead of N+1 loop
  if (journeys.length === 0 && fromRoutes.length > 0 && toRoutes.length > 0) {
    logger.log('[Routing] No direct route, looking for connections...');

    const fromRouteIds = fromRoutes.map(r => r.id);
    const toRouteIdsArr = toRoutes.map(r => r.id);
    const fromRouteMap = new Map(fromRoutes.map(r => [r.id, r]));
    const toRouteMap = new Map(toRoutes.map(r => [r.id, r]));

    // Single SQL query to find all transfer points between from-routes and to-routes
    const transferPoints = db.findTransferStops(fromRouteIds, toRouteIdsArr, 15);
    logger.log(`[Routing] Found ${transferPoints.length} transfer points in 1 query`);

    const transferJourneys: JourneyResult[] = [];
    const seenTransfers = new Set<string>(); // Deduplicate by route pair

    for (const tp of transferPoints) {
      const key = `${tp.fromRouteId}-${tp.toRouteId}`;
      if (seenTransfers.has(key)) continue;
      seenTransfers.add(key);

      const fromRoute = fromRouteMap.get(tp.fromRouteId);
      const toRoute = toRouteMap.get(tp.toRouteId);
      if (!fromRoute || !toRoute) continue;

      // During night hours, skip non-bus routes
      if (isNightHours && (fromRoute.type !== 3 || toRoute.type !== 3)) {
        logger.log(`[Routing] Skipping transfer ${fromRoute.shortName}→${toRoute.shortName}: non-bus routes don't run at night`);
        continue;
      }

      // Check if first leg has service at requested time (60 min for night buses)
      const firstLegDep = db.getNextDepartureForRoute(
        fromRoute.id, fromStopId, requestedTimeMinutes, activeServiceIds, 60
      );
      if (firstLegDep === null) {
        logger.log(`[Routing] Skipping transfer via ${tp.stopName}: ${fromRoute.shortName} has no service`);
        continue;
      }

      // From-route alights here
      const transferStopFrom: Stop = {
        id: tp.stopId, name: tp.stopName, lat: tp.lat, lon: tp.lon, locationType: 0,
      };
      // To-route boards here (may be physically different stop)
      const transferStopTo: Stop = {
        id: tp.toStopId, name: tp.stopName, lat: tp.toStopLat, lon: tp.toStopLon, locationType: 0,
      };

      // Calculate actual departure time for first leg
      const actualDep1 = new Date(departureTime);
      actualDep1.setHours(Math.floor(firstLegDep / 60), Math.round(firstLegDep % 60), 0, 0);

      // Calculate durations using correct stop IDs for each route
      const actual1 = db.getActualTravelTime(fromRoute.id, fromStopId, transferStopFrom.id);
      const actual2 = db.getActualTravelTime(toRoute.id, transferStopTo.id, toStopId);

      let duration1: number;
      if (actual1 !== null) {
        duration1 = Math.max(3, actual1);
      } else {
        const dist1Km = haversineDistance(fromStop.lat, fromStop.lon, transferStopFrom.lat, transferStopFrom.lon) / 1000;
        const travel1 = dist1Km * getTransitMinPerKm(fromRoute.type);
        const dwell1 = estimateIntermediateStops(dist1Km, fromRoute.type) * getDwellTimePerStop(fromRoute.type);
        duration1 = Math.max(3, Math.round(travel1 + dwell1));
      }

      // Check if second leg has service after arriving at transfer (60 min for night buses)
      const arrivalAtTransferMin = firstLegDep + duration1 + 3; // +3 min to walk/wait
      const secondLegDep = db.getNextDepartureForRoute(
        toRoute.id, transferStopTo.id, arrivalAtTransferMin, activeServiceIds, 60
      );
      if (secondLegDep === null) {
        logger.log(`[Routing] Skipping transfer via ${tp.stopName}: ${toRoute.shortName} has no service after transfer`);
        continue;
      }

      let duration2: number;
      if (actual2 !== null) {
        duration2 = Math.max(3, actual2);
      } else {
        const dist2Km = haversineDistance(transferStopTo.lat, transferStopTo.lon, toStop.lat, toStop.lon) / 1000;
        const travel2 = dist2Km * getTransitMinPerKm(toRoute.type);
        const dwell2 = estimateIntermediateStops(dist2Km, toRoute.type) * getDwellTimePerStop(toRoute.type);
        duration2 = Math.max(3, Math.round(travel2 + dwell2));
      }

      // Walking time between transfer stops (if physically > 30m apart)
      const transferWalkTime = tp.walkDistance > 30 ? Math.ceil(tp.walkDistance / 83.33) : 0;
      const transferTime = Math.max(TRANSFER_PENALTY_MIN, transferWalkTime + 2);

      // Calculate actual departure time for second leg
      const actualDep2 = new Date(departureTime);
      actualDep2.setHours(Math.floor(secondLegDep / 60), Math.round(secondLegDep % 60), 0, 0);

      const totalDuration = Math.round((actualDep2.getTime() - actualDep1.getTime()) / 60000) + duration2;

      // Build segments: transit → [walk if needed] → transit
      const segments: RouteSegment[] = [
        {
          type: 'transit',
          from: fromStop,
          to: transferStopFrom,
          route: fromRoute,
          departureTime: actualDep1,
          arrivalTime: new Date(actualDep1.getTime() + duration1 * 60000),
          duration: duration1,
        },
      ];

      if (tp.walkDistance > 30) {
        segments.push({
          type: 'walk',
          from: transferStopFrom,
          to: transferStopTo,
          duration: transferWalkTime,
          distance: tp.walkDistance,
        });
      }

      segments.push({
        type: 'transit',
        from: transferStopTo,
        to: toStop,
        route: toRoute,
        departureTime: actualDep2,
        arrivalTime: new Date(actualDep2.getTime() + duration2 * 60000),
        duration: duration2,
      });

      const journey: JourneyResult = {
        segments,
        totalDuration: totalDuration,
        totalWalkDistance: tp.walkDistance > 30 ? tp.walkDistance : 0,
        numberOfTransfers: 1,
        departureTime: actualDep1,
        arrivalTime: new Date(actualDep2.getTime() + duration2 * 60000),
      };

      transferJourneys.push(journey);
      if (transferJourneys.length >= 5) break;
    }

    transferJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    journeys.push(...transferJourneys.slice(0, 3));
  }

  // 5. Si toujours pas de trajet, cherche avec 2 correspondances (A → B → C → D)
  //    Strategy: find routes that bridge from-routes to to-routes via an intermediate route
  //    Uses batch queries: fromRoutes → midRoutes (via transfer stops) → toRoutes (via transfer stops)
  //    Only attempt if route sets are small enough to be tractable (skip for bus-heavy combos)
  if (journeys.length === 0 && fromRoutes.length > 0 && toRoutes.length > 0 && fromRoutes.length <= 6 && toRoutes.length <= 6) {
    logger.log('[Routing] No 1-transfer route, looking for 2-transfer connections...');

    const fromRouteIds = fromRoutes.map(r => r.id);
    const toRouteIdsArr = toRoutes.map(r => r.id);
    const fromRouteMap = new Map(fromRoutes.map(r => [r.id, r]));
    const toRouteMap = new Map(toRoutes.map(r => [r.id, r]));

    // Step 1: Find all routes reachable from fromRoutes (transfer point 1)
    // Get all routes at stops along departure routes (excluding departure routes themselves)
    const allFromRouteIds = new Set(fromRouteIds);
    const allToRouteIds = new Set(toRouteIdsArr);
    const midRouteSet = new Map<string, { route: Route; transferStop1: Stop; fromRouteId: string }>();

    for (const fromRoute of fromRoutes.slice(0, 3)) {
      const stops = await db.getStopsByRouteId(fromRoute.id);
      // Batch get routes for all these stops
      const stopIds = stops.filter(s => s.id !== fromStopId).map(s => s.id);
      if (stopIds.length === 0) continue;
      const routesByStop = await db.getRoutesByStopIds(stopIds);

      for (const [stopId, routes] of routesByStop) {
        for (const route of routes) {
          if (allFromRouteIds.has(route.id) || allToRouteIds.has(route.id)) continue;
          if (!midRouteSet.has(`${fromRoute.id}-${route.id}`)) {
            const stop = stops.find(s => s.id === stopId);
            if (stop) {
              midRouteSet.set(`${fromRoute.id}-${route.id}`, {
                route,
                transferStop1: stop,
                fromRouteId: fromRoute.id,
              });
            }
          }
        }
      }
    }

    logger.log(`[Routing] Found ${midRouteSet.size} intermediate route candidates`);

    // Step 2: For each intermediate route, check if it connects to any toRoute
    const twoTransferJourneys: JourneyResult[] = [];
    const midRouteIds = Array.from(new Set(Array.from(midRouteSet.values()).map(m => m.route.id)));

    // Batch query: find transfer points between mid routes and to routes
    const midToTransfers = db.findTransferStops(midRouteIds.slice(0, 10), toRouteIdsArr, 20);

    for (const tp of midToTransfers) {
      if (twoTransferJourneys.length >= 3) break;

      // Find which fromRoute→midRoute entry matches
      const midEntry = Array.from(midRouteSet.values()).find(
        m => m.route.id === tp.fromRouteId
      );
      if (!midEntry) continue;

      const fromRoute = fromRouteMap.get(midEntry.fromRouteId);
      const midRoute = midEntry.route;
      const toRoute = toRouteMap.get(tp.toRouteId);
      if (!fromRoute || !toRoute) continue;

      const transferStop1 = midEntry.transferStop1;
      const transferStop2: Stop = {
        id: tp.stopId,
        name: tp.stopName,
        lat: tp.lat,
        lon: tp.lon,
        locationType: 0,
      };

      // Calculate 3-segment durations
      const calcDuration = (routeObj: Route, fLat: number, fLon: number, tLat: number, tLon: number, routeId: string, fStopId: string, tStopId: string, addWait: boolean): number => {
        const actual = db.getActualTravelTime(routeId, fStopId, tStopId);
        if (actual !== null) return Math.max(3, actual + (addWait ? getAverageWaitTime(routeObj.type) : 0));
        const distKm = haversineDistance(fLat, fLon, tLat, tLon) / 1000;
        const travel = distKm * getTransitMinPerKm(routeObj.type);
        const dwell = estimateIntermediateStops(distKm, routeObj.type) * getDwellTimePerStop(routeObj.type);
        return Math.max(3, Math.round(travel + dwell + (addWait ? getAverageWaitTime(routeObj.type) : 0)));
      };

      const dur1 = calcDuration(fromRoute, fromStop.lat, fromStop.lon, transferStop1.lat, transferStop1.lon, fromRoute.id, fromStopId, transferStop1.id, true);
      const dur2 = calcDuration(midRoute, transferStop1.lat, transferStop1.lon, transferStop2.lat, transferStop2.lon, midRoute.id, transferStop1.id, transferStop2.id, false);
      const dur3 = calcDuration(toRoute, transferStop2.lat, transferStop2.lon, toStop.lat, toStop.lon, toRoute.id, transferStop2.id, toStopId, false);
      const totalDuration = dur1 + TRANSFER_PENALTY_MIN + dur2 + TRANSFER_PENALTY_MIN + dur3;

      // Headsign lookups deferred to enrichWithHeadsigns() for performance

      const journey: JourneyResult = {
        segments: [
          {
            type: 'transit',
            from: fromStop,
            to: transferStop1,
            route: fromRoute,
            departureTime: departureTime,
            arrivalTime: new Date(departureTime.getTime() + dur1 * 60000),
            duration: dur1,
          },
          {
            type: 'transit',
            from: transferStop1,
            to: transferStop2,
            route: midRoute,
            departureTime: new Date(departureTime.getTime() + (dur1 + TRANSFER_PENALTY_MIN) * 60000),
            arrivalTime: new Date(departureTime.getTime() + (dur1 + TRANSFER_PENALTY_MIN + dur2) * 60000),
            duration: dur2,
          },
          {
            type: 'transit',
            from: transferStop2,
            to: toStop,
            route: toRoute,
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

    // 2. Find nearby stops for both locations (3 per side → max 9 combinations)
    logger.log('[Routing] Finding nearby stops...');
    const [fromStops, toStops] = await Promise.all([
      findBestNearbyStops(fromLocation.lat, fromLocation.lon, 3, 2500),
      findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500),
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

    // 3. Build combinations and run sequentially with shared cache + time budget
    // Sync DB calls block the event loop, so Promise.all provides no parallelism.
    // Sequential execution with early exit is faster in practice.
    const TIME_BUDGET_MS = 10000; // 10s total time budget
    const startTime = Date.now();
    const routingCache = createRoutingCache();
    const combinations: { fromStop: NearbyStop; toStop: NearbyStop }[] = [];
    for (const fromStop of fromStops) {
      for (const toStop of toStops) {
        combinations.push({ fromStop, toStop });
      }
    }

    logger.log(`[Routing] Trying ${combinations.length} combinations with shared cache...`);

    const routeResults: { fromStop: NearbyStop; toStop: NearbyStop; routes: JourneyResult[] }[] = [];
    let totalRoutesFound = 0;

    for (const { fromStop, toStop } of combinations) {
      // Check time budget
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        logger.warn(`[Routing] Time budget exceeded after ${routeResults.length}/${combinations.length} combinations`);
        break;
      }
      // Early exit: if we already have enough diverse routes, stop searching
      if (totalRoutesFound >= 5) {
        logger.log(`[Routing] Found ${totalRoutesFound} routes, stopping early`);
        break;
      }

      try {
        const routes = await findRoute(fromStop.id, toStop.id, departureTime, routingCache);
        routeResults.push({ fromStop, toStop, routes });
        totalRoutesFound += routes.length;
      } catch {
        routeResults.push({ fromStop, toStop, routes: [] });
      }
    }

    logger.log(`[Routing] Completed ${routeResults.length}/${combinations.length} combinations in ${Date.now() - startTime}ms`);

    // 4. Collect journeys with walking segments, deduplicating by route signature
    const allJourneys: JourneyResult[] = [];
    const seenRouteKeys = new Set<string>();

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

    for (const { fromStop, toStop, routes } of routeResults) {
      for (const route of routes) {
        // Deduplicate: same transit lines (by user-visible name) in same order
        const routeKey = route.segments
          .filter(s => s.type === 'transit')
          .map(s => s.route?.shortName || s.route?.id || 'walk')
          .join('→');
        if (seenRouteKeys.has(routeKey)) continue;
        seenRouteKeys.add(routeKey);

        const walkToStop = getWalkingTime(fromStop.distance);
        const walkFromStop = getWalkingTime(toStop.distance);

        const newJourney: JourneyResult = {
          segments: [
            { type: 'walk', from: fromVirtualStop, to: fromStop, duration: walkToStop, distance: Math.round(fromStop.distance) },
            ...route.segments,
            { type: 'walk', from: toStop, to: toVirtualStop, duration: walkFromStop, distance: Math.round(toStop.distance) },
          ],
          totalDuration: route.totalDuration + walkToStop + walkFromStop,
          totalWalkDistance: route.totalWalkDistance + Math.round(fromStop.distance) + Math.round(toStop.distance),
          numberOfTransfers: route.numberOfTransfers,
          departureTime: route.departureTime,
          arrivalTime: route.arrivalTime,
        };

        allJourneys.push(newJourney);
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

    // Enrich final results with headsigns (deferred from findRoute for speed)
    await enrichWithHeadsigns(topJourneys);

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
      // Use top 3 stops per side (3×3=9 combinations) — good coverage with fast performance
      const [fromStops, toStops] = await Promise.all([
        findBestNearbyStops(fromLocation.lat, fromLocation.lon, 3, 2500),
        findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500),
      ]);

      if (fromStops.length === 0 || toStops.length === 0) {
        logger.log('[Routing] No nearby stops found, returning walking-only journey');
        return [walkingJourney];
      }

      logger.log(`[Routing] Found ${fromStops.length} from stops, ${toStops.length} to stops`);
      logger.log(`[Routing] Closest from stop: ${fromStops[0].name} (${Math.round(fromStops[0].distance)}m)`);
      logger.log(`[Routing] Closest to stop: ${toStops[0].name} (${Math.round(toStops[0].distance)}m)`);

      // 4. Try to find routes between nearby stops
      // Sequential with early exit and time budget (sync DB calls block event loop)
      const combinations: { fromStop: NearbyStop; toStop: NearbyStop }[] = [];
      for (const fromStop of fromStops) {
        for (const toStop of toStops) {
          combinations.push({ fromStop, toStop });
        }
      }

      logger.log(`[Routing] Calculating ${combinations.length} route combinations with shared cache`);

      const TIME_BUDGET_MS = 10000;
      const searchStartTime = Date.now();
      const routingCache = createRoutingCache();
      const routeResults: { fromStop: NearbyStop; toStop: NearbyStop; routes: JourneyResult[] }[] = [];
      let addressRoutesFound = 0;

      for (const { fromStop, toStop } of combinations) {
        if (Date.now() - searchStartTime > TIME_BUDGET_MS) {
          logger.warn(`[Routing] Time budget exceeded after ${routeResults.length}/${combinations.length} combinations`);
          break;
        }
        if (addressRoutesFound >= 5) {
          logger.log(`[Routing] Found ${addressRoutesFound} routes, stopping early`);
          break;
        }
        try {
          const routes = await findRoute(fromStop.id, toStop.id, departureTime, routingCache);
          routeResults.push({ fromStop, toStop, routes });
          addressRoutesFound += routes.length;
        } catch (error) {
          routeResults.push({ fromStop, toStop, routes: [] });
        }
      }

      logger.log(`[Routing] Completed ${routeResults.length}/${combinations.length} combinations in ${Date.now() - searchStartTime}ms`);

      // Process results and deduplicate
      const transitJourneys: JourneyResult[] = [];
      const seenRouteKeys = new Set<string>();

      for (const { fromStop, toStop, routes } of routeResults) {
        for (const route of routes) {
          // Create a unique key based on the transit lines used
          const routeKey = route.segments
            .filter(seg => seg.type === 'transit' && seg.route)
            .map(seg => seg.route!.shortName || seg.route!.id)
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

    // Enrich final results with headsigns (deferred from findRoute for speed)
    await enrichWithHeadsigns(allJourneys);

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

    // 2. Find nearby stops from starting coordinates (parallel)
    const [fromStops, toStops] = await Promise.all([
      findBestNearbyStops(fromLat, fromLon, 3, 2500),
      findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500),
    ]);

    if (fromStops.length === 0) {
      throw new Error('NO_STOPS_NEAR_POSITION');
    }
    if (toStops.length === 0) {
      throw new Error('No transit stops found near destination');
    }

    // 3. Build combinations (3×3=9 max) and run in parallel
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

    const combinations: { fromStop: NearbyStop; toStop: NearbyStop }[] = [];
    for (const fromStop of fromStops) {
      for (const toStop of toStops) {
        combinations.push({ fromStop, toStop });
      }
    }

    const TIME_BUDGET_MS = 10000;
    const coordSearchStart = Date.now();
    const routingCache = createRoutingCache();
    const routeResults: { fromStop: NearbyStop; toStop: NearbyStop; routes: JourneyResult[] }[] = [];
    let coordRoutesFound = 0;

    for (const { fromStop, toStop } of combinations) {
      if (Date.now() - coordSearchStart > TIME_BUDGET_MS) {
        logger.warn(`[Routing] Time budget exceeded after ${routeResults.length}/${combinations.length} combinations`);
        break;
      }
      if (coordRoutesFound >= 5) break;
      try {
        const routes = await findRoute(fromStop.id, toStop.id, departureTime, routingCache);
        routeResults.push({ fromStop, toStop, routes });
        coordRoutesFound += routes.length;
      } catch (error) {
        routeResults.push({ fromStop, toStop, routes: [] });
      }
    }

    // 4. Process results with deduplication
    const allJourneys: JourneyResult[] = [];
    const seenRouteKeys = new Set<string>();

    for (const { fromStop, toStop, routes } of routeResults) {
      for (const route of routes) {
        const routeKey = route.segments
          .filter(seg => seg.type === 'transit' && seg.route)
          .map(seg => seg.route!.shortName || seg.route!.id)
          .join('-');

        if (routeKey && seenRouteKeys.has(routeKey)) continue;
        seenRouteKeys.add(routeKey);

        const walkToStop = getWalkingTime(fromStop.distance);
        const walkFromStop = getWalkingTime(toStop.distance);

        const newJourney: JourneyResult = {
          segments: [
            { type: 'walk', from: fromVirtualStop, to: fromStop, duration: walkToStop, distance: Math.round(fromStop.distance) },
            ...route.segments,
            { type: 'walk', from: toStop, to: toVirtualStop, duration: walkFromStop, distance: Math.round(toStop.distance) },
          ],
          totalDuration: route.totalDuration + walkToStop + walkFromStop,
          totalWalkDistance: route.totalWalkDistance + Math.round(fromStop.distance) + Math.round(toStop.distance),
          numberOfTransfers: route.numberOfTransfers,
          departureTime: departureTime,
          arrivalTime: new Date(departureTime.getTime() + (route.totalDuration + walkToStop + walkFromStop) * 60000),
        };

        allJourneys.push(newJourney);
      }
    }

    // Filter out absurd durations
    const validJourneys = allJourneys.filter(j => j.totalDuration <= MAX_JOURNEY_DURATION_MIN);

    if (validJourneys.length === 0) {
      throw new Error('NO_ROUTE_FOUND');
    }

    validJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    const topJourneys = validJourneys.slice(0, 3);

    // Enrich final results with headsigns (deferred from findRoute for speed)
    await enrichWithHeadsigns(topJourneys);

    logger.log(`[Routing] Found ${validJourneys.length} journeys, returning top 3`);
    return topJourneys;

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

    // 0. Check if transit services are running at this time
    const activeServices = db.getActiveServiceIds(departureTime);
    const noTransitService = activeServices !== null && activeServices.size === 0;

    if (noTransitService) {
      logger.warn('[Routing] No active transit services at this time, returning walking-only route');

      // Build a walking-only journey between the two locations
      const distance = haversineDistance(from.lat, from.lon, to.lat, to.lon);
      const walkTime = Math.round(walkingTime(distance));

      const fromVirtualStop: Stop = {
        id: 'virtual_from',
        name: from.shortAddress || from.displayName,
        lat: from.lat,
        lon: from.lon,
        locationType: 0,
      };
      const toVirtualStop: Stop = {
        id: 'virtual_to',
        name: to.shortAddress || to.displayName,
        lat: to.lat,
        lon: to.lon,
        locationType: 0,
      };

      const walkingJourney: JourneyResult = {
        segments: [{
          type: 'walk',
          from: fromVirtualStop,
          to: toVirtualStop,
          duration: walkTime,
          distance: Math.round(distance),
        }],
        totalDuration: walkTime,
        totalWalkDistance: Math.round(distance),
        numberOfTransfers: 0,
        departureTime: departureTime,
        arrivalTime: new Date(departureTime.getTime() + walkTime * 60000),
        tags: ['no-transit-service'],
      };

      return [walkingJourney];
    }

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
