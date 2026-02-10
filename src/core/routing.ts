import Heap from 'heap-js';
import * as db from './database';
import { Stop, Route } from './types/models';
import { JourneyResult, RouteSegment } from './types/routing';
import { geocodeAddress, GeocodingResult } from './geocoding';
import { findBestNearbyStops, NearbyStop, getWalkingTime, expandToAllSameNameStops } from './nearby-stops';
import { logger } from '../utils/logger';
import { captureException } from '../services/crash-reporting';
import { getIzmirTime } from '../utils/time';
import {
  RoutingPreferences,
  DEFAULT_PREFERENCES,
  isRouteTypeAllowed,
  meetsPreferences,
  scoreJourney,
  getJourneyTags,
} from '../types/routing-preferences';
import {
  isTransitOperating,
  izmirOperatingHours,
  IZMIR_NIGHT_BUS_LINES,
} from '../adapters/izmir/config';

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
 * Calibrated for İzmir transit frequencies.
 */
function getAverageWaitTime(routeType: number): number {
  switch (routeType) {
    case 1: return 2;   // Metro: ~4 min headway → 2 min avg wait
    case 2: return 6;   // İZBAN: ~12 min headway → 6 min avg wait
    case 0: return 3;   // Tram: ~6 min headway → 3 min avg wait
    case 3: return 5;   // Bus: ~10 min headway → 5 min avg wait
    case 4: return 12;  // Ferry: ~25 min headway → 12 min avg wait
    default: return 5;
  }
}

/**
 * Calculate transfer time between two modes at a multimodal station.
 * Takes into account platform distance, escalators, and station layout.
 * İzmir-specific: Halkapınar has Metro↔İZBAN transfers, Konak has Metro↔Ferry.
 */
function getTransferTime(fromRouteType: number, toRouteType: number): number {
  // Same mode = same platform or adjacent platform
  if (fromRouteType === toRouteType) {
    return 2; // 2 min: same platform, just wait
  }

  // Metro (1) ↔ İZBAN (2): underground transfer at Halkapınar/Hilal
  if ((fromRouteType === 1 && toRouteType === 2) || (fromRouteType === 2 && toRouteType === 1)) {
    return 5; // 5 min: change platform, escalator
  }

  // Metro (1) ↔ Tram (0): exit station, walk to tram stop
  if ((fromRouteType === 1 && toRouteType === 0) || (fromRouteType === 0 && toRouteType === 1)) {
    return 6; // 6 min: exit + walk + wait at tram stop
  }

  // İZBAN (2) ↔ Tram (0): similar to Metro↔Tram
  if ((fromRouteType === 2 && toRouteType === 0) || (fromRouteType === 0 && toRouteType === 2)) {
    return 6; // 6 min
  }

  // Metro (1) ↔ Ferry (4): walk to ferry terminal (Konak)
  if ((fromRouteType === 1 && toRouteType === 4) || (fromRouteType === 4 && toRouteType === 1)) {
    return 10; // 10 min: longer walk to ferry terminal
  }

  // İZBAN (2) ↔ Ferry (4): walk to ferry terminal (Karşıyaka, Alsancak)
  if ((fromRouteType === 2 && toRouteType === 4) || (fromRouteType === 4 && toRouteType === 2)) {
    return 8; // 8 min: walk to ferry terminal
  }

  // Tram (0) ↔ Ferry (4): walk to ferry terminal
  if ((fromRouteType === 0 && toRouteType === 4) || (fromRouteType === 4 && toRouteType === 0)) {
    return 8; // 8 min
  }

  // Rail ↔ Bus (3): exit station, find bus stop
  if ((fromRouteType === 3 && toRouteType !== 3) || (fromRouteType !== 3 && toRouteType === 3)) {
    return 5; // 5 min: walk to/from bus stop
  }

  // Default fallback
  return 5;
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

// Minimum transfer time when physical walk distance is negligible
const MIN_TRANSFER_TIME = 2; // 2 min minimum even for same-platform transfers

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
 * Normalize stop name for comparison (remove prefixes like metro_1, tram_1, etc.)
 */
function normalizeStopName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Sanitize journey by removing only truly absurd segments:
 * - Transit segments where from.name === to.name (same stop, e.g., "Mavişehir → Mavişehir")
 * - Walk segments of 0 distance
 * Returns null only if journey becomes completely empty after sanitization
 */
function sanitizeJourney(journey: JourneyResult): JourneyResult | null {
  const sanitizedSegments: RouteSegment[] = [];

  for (let i = 0; i < journey.segments.length; i++) {
    const segment = journey.segments[i];

    // For transit segments: check if from/to have same name (absurd - same stop to same stop)
    if (segment.type === 'transit' && segment.from && segment.to) {
      const fromName = normalizeStopName(segment.from.name);
      const toName = normalizeStopName(segment.to.name);

      if (fromName === toName) {
        // Same stop to same stop - skip this segment entirely
        logger.log(`[Routing] Removing absurd transit segment: ${segment.from.name} → ${segment.to.name} on ${segment.route?.shortName}`);
        continue;
      }
    }

    // For walk segments: skip if 0 distance or same name stops
    if (segment.type === 'walk' && segment.from && segment.to) {
      // Skip 0-distance walks
      if (segment.distance !== undefined && segment.distance <= 0) {
        logger.log(`[Routing] Removing 0-distance walk`);
        continue;
      }

      const fromName = normalizeStopName(segment.from.name);
      const toName = normalizeStopName(segment.to.name);

      // Skip walk if from and to have exactly same normalized name AND distance is trivial (<100m)
      if (fromName === toName && segment.distance !== undefined && segment.distance < 100) {
        logger.log(`[Routing] Removing trivial walk between same-name stops: ${segment.from.name} (${segment.distance}m)`);
        continue;
      }
    }

    sanitizedSegments.push(segment);
  }

  // If no segments left after sanitization, return original journey (don't lose routes)
  if (sanitizedSegments.length === 0) {
    logger.warn(`[Routing] Sanitization removed all segments, keeping original journey`);
    return journey;
  }

  // Recalculate totals
  let totalDuration = 0;
  let totalWalkDistance = 0;
  let numberOfTransfers = 0;

  for (let i = 0; i < sanitizedSegments.length; i++) {
    const seg = sanitizedSegments[i];
    totalDuration += seg.duration || 0;

    if (seg.type === 'walk' && seg.distance) {
      totalWalkDistance += seg.distance;
    }

    // Count transfers (transit segment after another transit segment)
    if (seg.type === 'transit' && i > 0) {
      const prevSeg = sanitizedSegments[i - 1];
      if (prevSeg.type === 'transit' || prevSeg.type === 'walk') {
        // Check if this is a real transfer (not same route continuing)
        const prevTransit = sanitizedSegments.slice(0, i).reverse().find(s => s.type === 'transit');
        if (prevTransit && prevTransit.route?.id !== seg.route?.id) {
          numberOfTransfers++;
        }
      }
    }
  }

  // Get departure and arrival times from first and last segments
  const firstSeg = sanitizedSegments[0];
  const lastSeg = sanitizedSegments[sanitizedSegments.length - 1];
  const departureTime = firstSeg.departureTime || journey.departureTime;
  const arrivalTime = lastSeg.arrivalTime || new Date(departureTime.getTime() + totalDuration * 60000);

  return {
    ...journey,
    segments: sanitizedSegments,
    totalDuration,
    totalWalkDistance,
    numberOfTransfers,
    departureTime,
    arrivalTime,
  };
}

/**
 * Post-process journeys to add headsign and intermediate stops info
 * (skipped during search for speed)
 */
async function enrichWithHeadsigns(journeys: JourneyResult[]): Promise<void> {
  for (const journey of journeys) {
    for (const segment of journey.segments) {
      if (segment.type === 'transit' && segment.route) {
        // Add headsign if not already present
        if (!segment.trip) {
          const tripInfo = await db.getTripInfoForRoute(
            segment.route.id,
            segment.to.id,
            segment.from.id
          );
          if (tripInfo) {
            segment.trip = { headsign: tripInfo.headsign } as any;
          }
        }

        // Add intermediate stops count
        const stopsCount = db.getIntermediateStopsCount(
          segment.route.id,
          segment.from.id,
          segment.to.id
        );
        if (stopsCount !== null) {
          segment.intermediateStopsCount = stopsCount;
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

  // Convert departure time to İzmir local time (UTC+3) for GTFS comparison
  const izmirTime = getIzmirTime(departureTime);
  logger.log(`[Routing] 🕐 findRoute called with departureTime: ${departureTime.toISOString()} → İzmir time: ${izmirTime.hours}:${izmirTime.minutes.toString().padStart(2,'0')}`);

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

  // Get active service IDs for this date and time in İzmir local time
  const activeServiceIds = db.getActiveServiceIds(departureTime);
  const requestedTimeMinutes = izmirTime.totalMinutes;

  // Debug: Check if İZBAN services are active
  if (activeServiceIds) {
    const railServices = Array.from(activeServiceIds).filter(s => s.startsWith('rail_'));
    if (railServices.length === 0) {
      logger.log('[Routing] ⚠️ No rail_ services active! Reimport data to fix.');
    }
  }

  // Récupère les routes qui passent par les deux arrêts (using cache)
  // Cap at 10 routes per stop to prevent huge transfer queries
  const MAX_ROUTES_PER_STOP = 10;
  const fromRoutesRaw = await getCachedRoutes(fromStopId, cache);
  const toRoutesRaw = await getCachedRoutes(toStopId, cache);
  const fromRoutes = fromRoutesRaw.slice(0, MAX_ROUTES_PER_STOP);
  const toRoutes = toRoutesRaw.slice(0, MAX_ROUTES_PER_STOP);

  // Debug: log routes found for each stop
  logger.log(`[Routing] Routes for FROM stop "${fromStop.name}" (${fromStopId}): ${fromRoutes.map(r => `${r.shortName}(type=${r.type})`).join(', ') || 'NONE'}`);
  logger.log(`[Routing] Routes for TO stop "${toStop.name}" (${toStopId}): ${toRoutes.map(r => `${r.shortName}(type=${r.type})`).join(', ') || 'NONE'}`);

  // Trouve les routes communes (trajet direct)
  const fromRouteIds = new Set(fromRoutes.map(r => r.id));
  const directRoutes = toRoutes.filter(r => fromRouteIds.has(r.id));

  if (directRoutes.length > 0) {
    logger.log(`[Routing] Direct route found: ${directRoutes.map(r => r.shortName).join(', ')} (${fromStop.name} → ${toStop.name})`);
  } else {
    logger.log(`[Routing] No direct route between ${fromStop.name} and ${toStop.name}`);
  }

  // Log requested time for debugging
  const timeStr = `${Math.floor(requestedTimeMinutes/60)}:${(requestedTimeMinutes%60).toString().padStart(2,'0')}`;
  logger.log(`[Routing] 🕐 Requested time: ${timeStr} (${requestedTimeMinutes} min)`);

  for (const route of directRoutes.slice(0, 5)) { // Check more routes since some may have no service
    // Check if this transport mode is operating at the requested time
    const isOperating = isTransitOperating(route.type, requestedTimeMinutes, route.shortName);
    if (!isOperating) {
      const hours = izmirOperatingHours[route.type];
      const hoursInfo = hours ? `${hours.name}: ${Math.floor(hours.start/60)}:${(hours.start%60).toString().padStart(2,'0')}-${Math.floor(hours.end/60) % 24}:${(hours.end%60).toString().padStart(2,'0')}` : 'unknown';
      logger.log(`[Routing] ⛔ Skipping ${route.shortName} (type=${route.type}): not operating at ${timeStr} (${hoursInfo})`);
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
    // Handle midnight wrap: if nextDepartureMin < requestedTimeMinutes, it's the next day
    const actualDepartureTime = new Date(departureTime);
    actualDepartureTime.setHours(Math.floor(nextDepartureMin / 60), Math.round(nextDepartureMin % 60), 0, 0);
    if (nextDepartureMin < requestedTimeMinutes) {
      // Crossed midnight - add one day
      actualDepartureTime.setDate(actualDepartureTime.getDate() + 1);
    }

    // Try to get actual travel time from GTFS stop_times first
    // This also verifies that fromStop comes BEFORE toStop in the route sequence
    let actualTime = db.getActualTravelTime(route.id, fromStopId, toStopId);

    // If no data for this specific route, try to get time from ANY route between these stops
    // This helps when some İZBAN routes (1793, 1884) don't have stop_times but others (2010) do
    if (actualTime === null) {
      actualTime = db.getActualTravelTimeAnyRoute(fromStopId, toStopId);
    }

    let estimatedDuration: number;

    if (actualTime !== null) {
      // Use actual GTFS data
      estimatedDuration = Math.max(3, actualTime);
    } else {
      // Fallback: Use distance-based estimate for routes with incomplete GTFS data
      // (This is common for ferry, İZBAN, and newly opened metro extensions)
      const distanceKm = haversineDistance(fromStop.lat, fromStop.lon, toStop.lat, toStop.lon) / 1000;
      const minPerKm = getTransitMinPerKm(route.type);
      estimatedDuration = Math.max(3, Math.round(distanceKm * minPerKm));
      logger.log(`[Routing] Using distance estimate for ${route.shortName}: ${distanceKm.toFixed(1)}km × ${minPerKm} min/km = ${estimatedDuration}min (no GTFS data)`);
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
    logger.log(`[Routing] ✓ Added direct journey via ${route.shortName} (${estimatedDuration}min), total=${journeys.length}`);

    // Stop after finding 3 valid routes
    if (journeys.length >= 3) break;
  }

  // 4. ALWAYS search for transfer routes (even if direct routes exist)
  //    This ensures we find faster rail options vs slower direct bus routes
  //    Example: Metro+İZBAN transfer at Halkapınar might be faster than 3 direct buses
  if (fromRoutes.length > 0 && toRoutes.length > 0) {
    // Check if we already have fast rail options (Metro/İZBAN/Tram)
    const hasRailDirect = journeys.some(j =>
      j.segments.some(s => s.type === 'transit' && s.route && [0, 1, 2].includes(s.route.type))
    );

    // Always search for transfers if:
    // - No direct routes found, OR
    // - No rail direct routes found (might find faster rail+transfer)
    if (journeys.length === 0 || !hasRailDirect) {
      logger.log(`[Routing] Looking for transfer connections (direct routes: ${journeys.length}, hasRailDirect: ${hasRailDirect})...`);

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

      // Check if both transport modes are operating at the requested time
      const fromOperating = isTransitOperating(fromRoute.type, requestedTimeMinutes, fromRoute.shortName);
      const toOperating = isTransitOperating(toRoute.type, requestedTimeMinutes, toRoute.shortName);
      if (!fromOperating || !toOperating) {
        logger.log(`[Routing] ⛔ Skipping transfer ${fromRoute.shortName}→${toRoute.shortName}: not operating at ${timeStr} (from=${fromOperating}, to=${toOperating})`);
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
      // Handle midnight wrap: if firstLegDep < requestedTimeMinutes, it's the next day
      const actualDep1 = new Date(departureTime);
      actualDep1.setHours(Math.floor(firstLegDep / 60), Math.round(firstLegDep % 60), 0, 0);
      if (firstLegDep < requestedTimeMinutes) {
        // Crossed midnight - add one day
        actualDep1.setDate(actualDep1.getDate() + 1);
      }

      // Calculate durations using correct stop IDs for each route
      // Try GTFS times first, fall back to distance estimates
      const actual1 = db.getActualTravelTime(fromRoute.id, fromStopId, transferStopFrom.id);
      const actual2 = db.getActualTravelTime(toRoute.id, transferStopTo.id, toStopId);

      let duration1: number;
      if (actual1 !== null) {
        duration1 = Math.max(3, actual1);
      } else {
        // Fallback: distance-based estimate for first leg
        const dist1Km = haversineDistance(fromStop.lat, fromStop.lon, transferStopFrom.lat, transferStopFrom.lon) / 1000;
        duration1 = Math.max(3, Math.round(dist1Km * getTransitMinPerKm(fromRoute.type)));
        logger.log(`[Routing] Using distance estimate for leg1 ${fromRoute.shortName}: ${dist1Km.toFixed(1)}km = ${duration1}min`);
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
        // Fallback: distance-based estimate for second leg
        const dist2Km = haversineDistance(transferStopTo.lat, transferStopTo.lon, toStop.lat, toStop.lon) / 1000;
        duration2 = Math.max(3, Math.round(dist2Km * getTransitMinPerKm(toRoute.type)));
        logger.log(`[Routing] Using distance estimate for leg2 ${toRoute.shortName}: ${dist2Km.toFixed(1)}km = ${duration2}min`);
      }

      // Transfer time: mode-specific transfer + walking time (if physically > 30m apart)
      const transferWalkTime = tp.walkDistance > 30 ? Math.ceil(tp.walkDistance / 83.33) : 0;
      const modeTransferTime = getTransferTime(fromRoute.type, toRoute.type);
      const transferTime = Math.max(modeTransferTime, transferWalkTime + MIN_TRANSFER_TIME);

      // Calculate actual departure time for second leg
      // Handle midnight wrap: if secondLegDep < firstLegDep, it's the next day
      const actualDep2 = new Date(departureTime);
      actualDep2.setHours(Math.floor(secondLegDep / 60), Math.round(secondLegDep % 60), 0, 0);
      if (secondLegDep < firstLegDep) {
        // Crossed midnight - add one day
        actualDep2.setDate(actualDep2.getDate() + 1);
      }

      // Calculate total duration: time from first departure to second departure + second leg duration
      const waitAndTransferTime = Math.round((actualDep2.getTime() - actualDep1.getTime()) / 60000);
      const totalDuration = waitAndTransferTime + duration2;

      logger.log(`[Routing] Duration calc: dep1=${actualDep1.toISOString()}, dep2=${actualDep2.toISOString()}, wait=${waitAndTransferTime}min, leg2=${duration2}min, total=${totalDuration}min`);

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

      // Check if transfer stop is essentially the destination (same stop or very close)
      // This handles cases like: Ferry → Konak İskelesi → [walk] → Konak metro (destination)
      // where we shouldn't add a redundant metro segment
      const transferToDestDistance = haversineDistance(
        transferStopTo.lat, transferStopTo.lon,
        toStop.lat, toStop.lon
      );
      const isTransferStopDestination = transferStopTo.id === toStopId || transferToDestDistance < 100;

      if (isTransferStopDestination) {
        // Transfer stop IS the destination - add walking to final destination if needed
        if (transferToDestDistance > 30) {
          const walkToDestTime = Math.ceil(transferToDestDistance / 83.33);
          segments.push({
            type: 'walk',
            from: transferStopTo,
            to: toStop,
            duration: walkToDestTime,
            distance: Math.round(transferToDestDistance),
          });
        }
        // Don't add the second transit segment - we're already at destination!
        const finalDuration = duration1 + transferTime + (transferToDestDistance > 30 ? Math.ceil(transferToDestDistance / 83.33) : 0);
        const journey: JourneyResult = {
          segments,
          totalDuration: finalDuration,
          totalWalkDistance: (tp.walkDistance > 30 ? tp.walkDistance : 0) + (transferToDestDistance > 30 ? Math.round(transferToDestDistance) : 0),
          numberOfTransfers: 0, // It's effectively a direct route with walking
          departureTime: actualDep1,
          arrivalTime: new Date(actualDep1.getTime() + finalDuration * 60000),
        };
        transferJourneys.push(journey);
        if (transferJourneys.length >= 5) break;
        continue; // Skip the regular transfer journey building
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
    } // End of inner if (journeys.length === 0 || !hasRailDirect)
  } // End of outer if (fromRoutes.length > 0 && toRoutes.length > 0)

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

      // Check operating hours for all three legs
      const fromOperating = isTransitOperating(fromRoute.type, requestedTimeMinutes, fromRoute.shortName);
      const midOperating = isTransitOperating(midRoute.type, requestedTimeMinutes, midRoute.shortName);
      const toOperating = isTransitOperating(toRoute.type, requestedTimeMinutes, toRoute.shortName);
      if (!fromOperating || !midOperating || !toOperating) {
        logger.log(`[Routing] ⛔ Skipping 2-transfer ${fromRoute.shortName}→${midRoute.shortName}→${toRoute.shortName}: not operating at ${timeStr}`);
        continue;
      }

      const transferStop1 = midEntry.transferStop1;
      const transferStop2: Stop = {
        id: tp.stopId,
        name: tp.stopName,
        lat: tp.lat,
        lon: tp.lon,
        locationType: 0,
      };

      // Calculate 3-segment durations - try GTFS times, fall back to distance estimates
      const actual1 = db.getActualTravelTime(fromRoute.id, fromStopId, transferStop1.id);
      const actual2 = db.getActualTravelTime(midRoute.id, transferStop1.id, transferStop2.id);
      const actual3 = db.getActualTravelTime(toRoute.id, transferStop2.id, toStopId);

      // Calculate durations with distance-based fallback for routes with incomplete GTFS data
      let dur1: number;
      if (actual1 !== null) {
        dur1 = Math.max(3, actual1 + getAverageWaitTime(fromRoute.type));
      } else {
        const dist1Km = haversineDistance(fromStop.lat, fromStop.lon, transferStop1.lat, transferStop1.lon) / 1000;
        dur1 = Math.max(3, Math.round(dist1Km * getTransitMinPerKm(fromRoute.type)) + getAverageWaitTime(fromRoute.type));
        logger.log(`[Routing] 2-transfer leg1 ${fromRoute.shortName}: distance estimate ${dist1Km.toFixed(1)}km = ${dur1}min`);
      }

      let dur2: number;
      if (actual2 !== null) {
        dur2 = Math.max(3, actual2);
      } else {
        const dist2Km = haversineDistance(transferStop1.lat, transferStop1.lon, transferStop2.lat, transferStop2.lon) / 1000;
        dur2 = Math.max(3, Math.round(dist2Km * getTransitMinPerKm(midRoute.type)));
        logger.log(`[Routing] 2-transfer leg2 ${midRoute.shortName}: distance estimate ${dist2Km.toFixed(1)}km = ${dur2}min`);
      }

      let dur3: number;
      if (actual3 !== null) {
        dur3 = Math.max(3, actual3);
      } else {
        const dist3Km = haversineDistance(transferStop2.lat, transferStop2.lon, toStop.lat, toStop.lon) / 1000;
        dur3 = Math.max(3, Math.round(dist3Km * getTransitMinPerKm(toRoute.type)));
        logger.log(`[Routing] 2-transfer leg3 ${toRoute.shortName}: distance estimate ${dist3Km.toFixed(1)}km = ${dur3}min`);
      }

      // Mode-specific transfer times for 2-transfer journeys
      const transfer1Time = getTransferTime(fromRoute.type, midRoute.type);
      const transfer2Time = getTransferTime(midRoute.type, toRoute.type);
      const totalDuration = dur1 + transfer1Time + dur2 + transfer2Time + dur3;

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
            departureTime: new Date(departureTime.getTime() + (dur1 + transfer1Time) * 60000),
            arrivalTime: new Date(departureTime.getTime() + (dur1 + transfer1Time + dur2) * 60000),
            duration: dur2,
          },
          {
            type: 'transit',
            from: transferStop2,
            to: toStop,
            route: toRoute,
            departureTime: new Date(departureTime.getTime() + (dur1 + transfer1Time + dur2 + transfer2Time) * 60000),
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

  // Sanitize journeys to remove absurd segments (e.g., same stop to same stop)
  const sanitizedJourneys = journeys
    .map(sanitizeJourney)
    .filter((j): j is JourneyResult => j !== null);

  // Filter out journeys with absurd durations (coordinate errors can cause 40+ hour estimates)
  const validJourneys = sanitizedJourneys.filter(j => j.totalDuration <= MAX_JOURNEY_DURATION_MIN);

  // Sort all journeys by duration to show fastest options first
  // This ensures rail transfers (e.g., Metro+İZBAN) are shown before slower bus routes
  validJourneys.sort((a, b) => a.totalDuration - b.totalDuration);

  // 6. Night bus fallback: if no routes and it's night time, try to find night bus connections
  const isNightTime = requestedTimeMinutes >= 23 * 60 || requestedTimeMinutes < 5 * 60;
  if (validJourneys.length === 0 && isNightTime) {
    logger.log('[Routing] 🦉 Night time with no routes, searching for Baykuş night buses...');

    // Find night bus routes that pass through stops near origin
    const nightBusRoutes = fromRoutes.filter(r =>
      r.type === 3 && IZMIR_NIGHT_BUS_LINES.includes(r.shortName || '')
    );

    if (nightBusRoutes.length > 0) {
      logger.log(`[Routing] Found ${nightBusRoutes.length} night bus routes at origin: ${nightBusRoutes.map(r => r.shortName).join(', ')}`);

      for (const nightRoute of nightBusRoutes.slice(0, 3)) {
        // Check if this night bus also serves the destination area
        const nightBusStopsAtDest = toRoutes.filter(r => r.id === nightRoute.id);

        if (nightBusStopsAtDest.length > 0) {
          // Direct night bus route found!
          logger.log(`[Routing] 🦉 Night bus ${nightRoute.shortName} serves both origin and destination!`);

          const nextDep = db.getNextDepartureForRoute(nightRoute.id, fromStopId, requestedTimeMinutes, activeServiceIds, 60);
          if (nextDep !== null) {
            const actualDep = new Date(departureTime);
            actualDep.setHours(Math.floor(nextDep / 60), Math.round(nextDep % 60), 0, 0);
            if (nextDep < requestedTimeMinutes) {
              actualDep.setDate(actualDep.getDate() + 1);
            }

            const travelTime = db.getActualTravelTime(nightRoute.id, fromStopId, toStopId);
            const duration = travelTime !== null ? Math.max(5, travelTime) : Math.round(directDistance / 1000 * 3.0);

            validJourneys.push({
              segments: [{
                type: 'transit',
                from: fromStop,
                to: toStop,
                route: nightRoute,
                departureTime: actualDep,
                arrivalTime: new Date(actualDep.getTime() + duration * 60000),
                duration: duration,
              }],
              totalDuration: duration,
              totalWalkDistance: 0,
              numberOfTransfers: 0,
              departureTime: actualDep,
              arrivalTime: new Date(actualDep.getTime() + duration * 60000),
              tags: ['night-bus'],
            });
            logger.log(`[Routing] 🦉 Added night bus route: ${nightRoute.shortName}, duration=${duration}min`);
          }
        }
      }
    }
  }

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

  logger.log(`[Routing] findRoute returning ${validJourneys.length} journeys for ${fromStopId}→${toStopId}`);
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
    logger.log('[Routing] From:', fromLocation.displayName || fromLocation.shortAddress, 'stopId:', fromLocation.stopId || 'none');
    logger.log('[Routing] To:', toLocation.displayName || toLocation.shortAddress, 'stopId:', toLocation.stopId || 'none');

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
    // If stopId is provided (user selected a specific stop), use it directly
    // Otherwise, search for nearby stops by coordinates
    logger.log('[Routing] Finding nearby stops...');

    let fromStops: NearbyStop[];
    let toStops: NearbyStop[];

    if (fromLocation.stopId) {
      // User selected a specific stop - use it directly
      const selectedStop = await db.getStopById(fromLocation.stopId);
      if (selectedStop) {
        logger.log(`[Routing] Using selected FROM stop: ${selectedStop.name} (${selectedStop.id})`);
        const nearbyStop: NearbyStop = { ...selectedStop, distance: 0 };
        // Expand to get all modes at this station
        fromStops = expandToAllSameNameStops([nearbyStop]);
      } else {
        // Stop not found, fall back to coordinate search
        logger.warn(`[Routing] Selected FROM stop ${fromLocation.stopId} not found, searching by coordinates`);
        const fromStopsBase = await findBestNearbyStops(fromLocation.lat, fromLocation.lon, 3, 2500);
        fromStops = expandToAllSameNameStops(fromStopsBase);
      }
    } else {
      // Search by coordinates
      const fromStopsBase = await findBestNearbyStops(fromLocation.lat, fromLocation.lon, 3, 2500);
      if (fromStopsBase.length === 0) {
        throw new Error(`NO_STOPS_NEAR:${fromLocation.shortAddress || fromLocation.displayName}`);
      }
      fromStops = expandToAllSameNameStops(fromStopsBase);
    }

    if (toLocation.stopId) {
      // User selected a specific stop - use it directly
      const selectedStop = await db.getStopById(toLocation.stopId);
      if (selectedStop) {
        logger.log(`[Routing] Using selected TO stop: ${selectedStop.name} (${selectedStop.id})`);
        const nearbyStop: NearbyStop = { ...selectedStop, distance: 0 };
        // Expand to get all modes at this station
        toStops = expandToAllSameNameStops([nearbyStop]);
      } else {
        // Stop not found, fall back to coordinate search
        logger.warn(`[Routing] Selected TO stop ${toLocation.stopId} not found, searching by coordinates`);
        const toStopsBase = await findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500);
        toStops = expandToAllSameNameStops(toStopsBase);
      }
    } else {
      // Search by coordinates
      const toStopsBase = await findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500);
      if (toStopsBase.length === 0) {
        throw new Error(`NO_STOPS_NEAR:${toLocation.shortAddress || toLocation.displayName}`);
      }
      toStops = expandToAllSameNameStops(toStopsBase);
    }

    if (fromStops.length === 0) {
      throw new Error(`NO_STOPS_NEAR:${fromLocation.shortAddress || fromLocation.displayName}`);
    }
    if (toStops.length === 0) {
      throw new Error(`NO_STOPS_NEAR:${toLocation.shortAddress || toLocation.displayName}`);
    }

    // Log all stop IDs being used (critical for debugging)
    const fromStopIds = fromStops.map(s => s.id).join(', ');
    const toStopIds = toStops.map(s => s.id).join(', ');
    logger.log(`[Routing] FROM stops (${fromStops.length}): ${fromStopIds}`);
    logger.log(`[Routing] TO stops (${toStops.length}): ${toStopIds}`);

    // Check if İZBAN stops are included
    const hasFromRail = fromStops.some(s => s.id.startsWith('rail_'));
    const hasToRail = toStops.some(s => s.id.startsWith('rail_'));
    if (!hasFromRail || !hasToRail) {
      logger.warn(`[Routing] ⚠️ İZBAN missing: from=${hasFromRail}, to=${hasToRail}`);
    } else {
      logger.log(`[Routing] ✓ İZBAN stops included in both from and to`);
    }

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

    // Sort combinations to prioritize rail modes (Metro, İZBAN, Tram, Ferry) over bus
    // Key insight: metro→rail should be tried BEFORE bus→bus, even though bus→bus is "same mode"
    const isRailMode = (stopId: string): boolean => {
      return stopId.startsWith('metro_') || stopId.startsWith('rail_') ||
             stopId.startsWith('tram_') || stopId.startsWith('ferry_');
    };
    const getStopPriority = (stopId: string): number => {
      if (stopId.startsWith('metro_')) return 0;  // Metro - highest (user selected this)
      if (stopId.startsWith('rail_')) return 1;   // İZBAN
      if (stopId.startsWith('ferry_')) return 2;  // Ferry
      if (stopId.startsWith('tram_')) return 3;   // Tram
      return 4;                                    // Bus and others
    };
    combinations.sort((a, b) => {
      const aFromRail = isRailMode(a.fromStop.id);
      const aToRail = isRailMode(a.toStop.id);
      const bFromRail = isRailMode(b.fromStop.id);
      const bToRail = isRailMode(b.toStop.id);

      // Count how many rail stops in each combination
      const aRailCount = (aFromRail ? 1 : 0) + (aToRail ? 1 : 0);
      const bRailCount = (bFromRail ? 1 : 0) + (bToRail ? 1 : 0);

      // Prioritize combinations with MORE rail stops (2 > 1 > 0)
      if (aRailCount !== bRailCount) {
        return bRailCount - aRailCount; // Higher rail count first
      }

      // If same rail count, sort by best priority
      const aPriority = Math.min(getStopPriority(a.fromStop.id), getStopPriority(a.toStop.id));
      const bPriority = Math.min(getStopPriority(b.fromStop.id), getStopPriority(b.toStop.id));
      return aPriority - bPriority;
    });

    // Log first few combinations to verify sorting
    logger.log(`[Routing] 🚇 First 3 combos: ${combinations.slice(0, 3).map(c => `${c.fromStop.id}→${c.toStop.id}`).join(', ')}`);
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

    logger.log(`[Routing] Processing ${routeResults.length} route results, totalRoutesFound=${totalRoutesFound}`);

    for (const { fromStop, toStop, routes } of routeResults) {
      if (routes.length > 0) {
        logger.log(`[Routing] Result ${fromStop.id}→${toStop.id}: ${routes.length} routes found`);
      }
      for (const route of routes) {
        // Deduplicate: same transit lines (by user-visible name) in same order
        const routeKey = route.segments
          .filter(s => s.type === 'transit')
          .map(s => s.route?.shortName || s.route?.id || 'walk')
          .join('→');
        if (seenRouteKeys.has(routeKey)) {
          logger.log(`[Routing] Skipping duplicate route: ${routeKey}`);
          continue;
        }
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

        logger.log(`[Routing] Added journey: ${routeKey}, duration=${newJourney.totalDuration}min`);
        allJourneys.push(newJourney);
      }
    }

    logger.log(`[Routing] Total journeys before sanitization: ${allJourneys.length}`);

    // Sanitize journeys to remove absurd segments, then filter by duration
    const sanitizedJourneys = allJourneys
      .map(sanitizeJourney)
      .filter((j): j is JourneyResult => j !== null);

    logger.log(`[Routing] After sanitization: ${sanitizedJourneys.length} journeys`);

    const validJourneys = sanitizedJourneys.filter(j => j.totalDuration <= MAX_JOURNEY_DURATION_MIN);

    logger.log(`[Routing] After duration filter (max ${MAX_JOURNEY_DURATION_MIN}min): ${validJourneys.length} journeys`);

    if (validJourneys.length === 0) {
      // Log why no valid journeys
      if (allJourneys.length > 0) {
        logger.warn(`[Routing] All ${allJourneys.length} journeys were filtered out!`);
        allJourneys.slice(0, 3).forEach((j, i) => {
          const routeNames = j.segments.filter(s => s.type === 'transit').map(s => s.route?.shortName).join('→');
          logger.warn(`[Routing] Journey ${i}: ${routeNames}, duration=${j.totalDuration}min`);
        });
      }
      throw new Error('NO_ROUTE_FOUND');
    }

    // Sort by duration and return top 5
    validJourneys.sort((a, b) => a.totalDuration - b.totalDuration);
    const topJourneys = validJourneys.slice(0, 5);

    // Enrich final results with headsigns (deferred from findRoute for speed)
    await enrichWithHeadsigns(topJourneys);

    logger.log(`[Routing] Found ${topJourneys.length} journey options`);
    return topJourneys;
  } catch (error: any) {
    // NO_ROUTE_FOUND is expected behavior (e.g., night hours, no service)
    // Don't log as error or send to Sentry - let caller handle gracefully
    if (error?.message === 'NO_ROUTE_FOUND') {
      logger.warn('[Routing] No route found between locations');
      throw error;
    }
    // Only log and report unexpected errors
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
      // Use top 3 stations per side, then expand to all transport modes
      const [fromStopsBase, toStopsBase] = await Promise.all([
        findBestNearbyStops(fromLocation.lat, fromLocation.lon, 3, 2500),
        findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500),
      ]);

      if (fromStopsBase.length === 0 || toStopsBase.length === 0) {
        logger.log('[Routing] No nearby stops found, returning walking-only journey');
        return [walkingJourney];
      }

      // Expand to include ALL stops at each station (metro, İZBAN, bus, tram, ferry)
      const fromStops = expandToAllSameNameStops(fromStopsBase);
      const toStops = expandToAllSameNameStops(toStopsBase);

      logger.log(`[Routing] Found ${fromStopsBase.length} from stations → ${fromStops.length} stops`);
      logger.log(`[Routing] Found ${toStopsBase.length} to stations → ${toStops.length} stops`);
      logger.log(`[Routing] Closest from stop: ${fromStopsBase[0].name} (${Math.round(fromStopsBase[0].distance)}m)`);
      logger.log(`[Routing] Closest to stop: ${toStopsBase[0].name} (${Math.round(toStopsBase[0].distance)}m)`);

      // 4. Try to find routes between nearby stops
      // Sequential with early exit and time budget (sync DB calls block event loop)
      const combinations: { fromStop: NearbyStop; toStop: NearbyStop }[] = [];
      for (const fromStop of fromStops) {
        for (const toStop of toStops) {
          combinations.push({ fromStop, toStop });
        }
      }

      // Sort combinations to prioritize high-speed transit modes (İZBAN, Metro, Ferry)
      const getStopPriority = (stopId: string): number => {
        if (stopId.startsWith('rail_')) return 0;   // İZBAN
        if (stopId.startsWith('ferry_')) return 1;  // Ferry
        if (stopId.startsWith('metro_')) return 2;  // Metro
        if (stopId.startsWith('tram_')) return 3;   // Tram
        return 4;
      };
      combinations.sort((a, b) => {
        const aPriority = Math.min(getStopPriority(a.fromStop.id), getStopPriority(a.toStop.id));
        const bPriority = Math.min(getStopPriority(b.fromStop.id), getStopPriority(b.toStop.id));
        return aPriority - bPriority;
      });

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

  } catch (error: any) {
    // NO_ROUTE_FOUND is expected behavior - don't log as error or send to Sentry
    if (error?.message === 'NO_ROUTE_FOUND') {
      logger.warn('[Routing] No route found between addresses');
      throw error;
    }
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
    const [fromStopsBase, toStopsBase] = await Promise.all([
      findBestNearbyStops(fromLat, fromLon, 3, 2500),
      findBestNearbyStops(toLocation.lat, toLocation.lon, 3, 2500),
    ]);

    if (fromStopsBase.length === 0) {
      throw new Error('NO_STOPS_NEAR_POSITION');
    }
    if (toStopsBase.length === 0) {
      throw new Error('No transit stops found near destination');
    }

    // Expand to include ALL stops at each station (metro, İZBAN, bus, tram, ferry)
    const fromStops = expandToAllSameNameStops(fromStopsBase);
    const toStops = expandToAllSameNameStops(toStopsBase);

    // 3. Build combinations and run in parallel
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

    // Sort combinations to prioritize high-speed transit modes (İZBAN, Metro, Ferry)
    const getStopPriority = (stopId: string): number => {
      if (stopId.startsWith('rail_')) return 0;   // İZBAN
      if (stopId.startsWith('ferry_')) return 1;  // Ferry
      if (stopId.startsWith('metro_')) return 2;  // Metro
      if (stopId.startsWith('tram_')) return 3;   // Tram
      return 4;
    };
    combinations.sort((a, b) => {
      const aPriority = Math.min(getStopPriority(a.fromStop.id), getStopPriority(a.toStop.id));
      const bPriority = Math.min(getStopPriority(b.fromStop.id), getStopPriority(b.toStop.id));
      return aPriority - bPriority;
    });

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

  } catch (error: any) {
    // NO_ROUTE_FOUND is expected behavior - don't log as error or send to Sentry
    if (error?.message === 'NO_ROUTE_FOUND') {
      logger.warn('[Routing] No route found from coordinates');
      throw error;
    }
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

    // Check if it's night hours (midnight to 5 AM) - limited service in İzmir
    // Use İzmir local time (UTC+3) for proper comparison
    const izmirTime = getIzmirTime(departureTime);
    const isNightHours = izmirTime.hours >= 0 && izmirTime.hours < 5;

    // 0. Check if transit services are running at this time
    const activeServices = db.getActiveServiceIds(departureTime);
    const noTransitService = activeServices !== null && activeServices.size === 0;

    // Helper to build walking-only journey
    const buildWalkingJourney = (tag: string): JourneyResult => {
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

      return {
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
        tags: [tag],
      };
    };

    if (noTransitService) {
      logger.warn('[Routing] No active transit services at this time, returning walking-only route');
      return [buildWalkingJourney('no-transit-service')];
    }

    // 1. Get base routes using findRouteFromLocations
    let rawRoutes: JourneyResult[];
    try {
      rawRoutes = await findRouteFromLocations(from, to, departureTime);
    } catch (error: any) {
      // If no route found, check if it's due to night hours
      if (error?.message === 'NO_ROUTE_FOUND' && isNightHours) {
        logger.warn('[Routing] No routes found during night hours (00:00-05:00), returning walking-only');
        return [buildWalkingJourney('night-hours')];
      }
      throw error;
    }

    if (rawRoutes.length === 0) {
      return [];
    }

    logger.log(`[Routing] Found ${rawRoutes.length} raw routes`);

    // 1b. Sanitize routes to remove absurd segments (e.g., "Mavişehir → Mavişehir")
    const baseRoutes = rawRoutes
      .map(sanitizeJourney)
      .filter((j): j is JourneyResult => j !== null);

    logger.log(`[Routing] After sanitization: ${baseRoutes.length} valid routes`);

    if (baseRoutes.length === 0) {
      return [];
    }

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
        logger.log(`[Routing] Filtered out: walk=${journey.totalWalkDistance}m > max=${preferences.maxWalkingDistance}m, transfers=${journey.numberOfTransfers}`);
        return false;
      }

      // Check if all transit segments use allowed modes
      const hasDisallowedMode = journey.segments.some((segment) => {
        if (segment.type === 'transit' && segment.route) {
          const allowed = isRouteTypeAllowed(segment.route.type, preferences);
          if (!allowed) {
            logger.log(`[Routing] Filtered out: mode ${segment.route.shortName} (type=${segment.route.type}) not allowed`);
          }
          return !allowed;
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
  } catch (error: any) {
    // NO_ROUTE_FOUND is expected behavior - don't log as error or send to Sentry
    if (error?.message === 'NO_ROUTE_FOUND') {
      logger.warn('[Routing] No route found');
      throw error;
    }
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
  } catch (error: any) {
    // NO_ROUTE_FOUND is expected behavior - don't log as error or send to Sentry
    if (error?.message === 'NO_ROUTE_FOUND') {
      logger.warn('[Routing] No route found from addresses');
      throw error;
    }
    logger.error('[Routing] Error finding multiple routes from addresses:', error);
    captureException(error, { tags: { module: 'routing', action: 'find_multiple_routes_from_addresses' } });
    throw error;
  }
}
