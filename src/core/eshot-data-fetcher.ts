/**
 * ESHOT Bus Data Fetcher
 * Fetches İzmir bus data from the İzmir open data portal (CKAN DataStore API)
 * Source: https://acikveri.bizizmir.com
 *
 * Data sources:
 * - Bus stops: 11,605 stops with coordinates and route associations
 * - Bus routes: 428 routes with names and start/end points
 * - Bus schedules: ~75,000 weekday departure entries
 */

import * as db from './database';
import type { Stop, Route, Trip, StopTime } from './types/models';

// CKAN DataStore API configuration
const CKAN_BASE = 'https://acikveri.bizizmir.com/api/3/action';
const STOPS_RESOURCE_ID = '0c791266-a2e4-4f14-82b8-9a9b102fbf94';
const ROUTES_RESOURCE_ID = 'bd6c84f8-49ba-4cf4-81f8-81a0fbb5caa3';
const SCHEDULES_RESOURCE_ID = 'c6fa6046-f755-47d7-b69e-db6bb06a8b5a';

// ESHOT bus color (distinct amber/orange to differentiate from other transit types)
const ESHOT_BUS_COLOR = '#FF6F00';
const ESHOT_TEXT_COLOR = '#FFFFFF';

// Maximum departures per route to keep database size manageable
const MAX_DEPARTURES_PER_ROUTE = 10;

// ============================================================================
// CKAN API Types
// ============================================================================

interface EshotRawStop {
  _id: number;
  DURAK_ID: number;
  DURAK_ADI: string;
  ENLEM: number;
  BOYLAM: number;
  DURAKTAN_GECEN_HATLAR: string;
}

interface EshotRawRoute {
  _id: number;
  HAT_NO: number;
  HAT_ADI: string;
  GUZERGAH_ACIKLAMA: string;
  ACIKLAMA: string;
  HAT_BASLANGIC: string;
  HAT_BITIS: string;
}

interface EshotRawSchedule {
  _id: number;
  HAT_NO: number;
  TARIFE_ID: number;
  GIDIS_SAATI: string;
  DONUS_SAATI: string;
  SIRA: number;
  GIDIS_ENGELLI_DESTEGI: string;
  DONUS_ENGELLI_DESTEGI: string;
  BISIKLETLI_GIDIS: string;
  BISIKLETLI_DONUS: string;
  GIDIS_ELEKTRIKLI_OTOBUS: string;
  DONUS_ELEKTRIKLI_OTOBUS: string;
}

interface CKANResponse<T> {
  success: boolean;
  result: {
    records: T[];
    total: number;
  };
}

// ============================================================================
// CKAN API Fetching
// ============================================================================

/**
 * Fetch paginated records from CKAN DataStore API
 */
async function fetchFromDataStore<T>(
  resourceId: string,
  options: {
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
  } = {}
): Promise<{ records: T[]; total: number }> {
  const { limit = 32000, offset = 0, filters } = options;

  let url = `${CKAN_BASE}/datastore_search?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
  if (filters) {
    url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
  }

  console.log(`[ESHOT] Fetching: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CKAN API error: HTTP ${response.status}`);
  }

  const data: CKANResponse<T> = await response.json();
  if (!data.success) {
    throw new Error('CKAN API returned success=false');
  }

  return {
    records: data.result.records,
    total: data.result.total,
  };
}

/**
 * Fetch all records with automatic pagination
 */
async function fetchAllFromDataStore<T>(
  resourceId: string,
  options: {
    filters?: Record<string, any>;
    batchSize?: number;
    onProgress?: (loaded: number, total: number) => void;
  } = {}
): Promise<T[]> {
  const { filters, batchSize = 32000, onProgress } = options;
  const allRecords: T[] = [];
  let offset = 0;
  let total = 0;

  do {
    const result = await fetchFromDataStore<T>(resourceId, {
      limit: batchSize,
      offset,
      filters,
    });

    allRecords.push(...result.records);
    total = result.total;
    offset += batchSize;
    onProgress?.(allRecords.length, total);

    console.log(`[ESHOT] Fetched ${allRecords.length}/${total} records`);
  } while (allRecords.length < total);

  return allRecords;
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

async function fetchEshotRoutes(): Promise<EshotRawRoute[]> {
  console.log('[ESHOT] Fetching bus routes...');
  const { records } = await fetchFromDataStore<EshotRawRoute>(ROUTES_RESOURCE_ID, {
    limit: 500,
  });
  console.log(`[ESHOT] Fetched ${records.length} bus routes`);
  return records;
}

async function fetchEshotStops(
  onProgress?: (loaded: number, total: number) => void
): Promise<EshotRawStop[]> {
  console.log('[ESHOT] Fetching bus stops...');
  const records = await fetchAllFromDataStore<EshotRawStop>(STOPS_RESOURCE_ID, {
    batchSize: 6000,
    onProgress,
  });
  console.log(`[ESHOT] Fetched ${records.length} bus stops`);
  return records;
}

async function fetchEshotSchedules(
  onProgress?: (loaded: number, total: number) => void
): Promise<EshotRawSchedule[]> {
  console.log('[ESHOT] Fetching weekday bus schedules (TARIFE_ID=1)...');
  const records = await fetchAllFromDataStore<EshotRawSchedule>(SCHEDULES_RESOURCE_ID, {
    filters: { TARIFE_ID: 1 },
    batchSize: 32000,
    onProgress,
  });
  console.log(`[ESHOT] Fetched ${records.length} weekday schedule entries`);
  return records;
}

// ============================================================================
// Data Conversion
// ============================================================================

/**
 * Parse DURAKTAN_GECEN_HATLAR field to get route numbers
 * Format: "29-30" means routes 29 and 30 (dash-separated)
 */
function parseRoutesAtStop(routesStr: string): string[] {
  if (!routesStr || routesStr.trim() === '') return [];
  return routesStr.split('-').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Normalize time string to HH:MM:SS format
 */
function normalizeTime(time: string): string {
  if (!time || time.trim() === '') return '';
  const trimmed = time.trim();
  // Already HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  // HH:MM format → add :00
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const parts = trimmed.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
  }
  return trimmed;
}

/**
 * Convert ESHOT raw data to our database models
 */
function convertToModels(
  rawRoutes: EshotRawRoute[],
  rawStops: EshotRawStop[],
  rawSchedules: EshotRawSchedule[]
): { stops: Stop[]; routes: Route[]; trips: Trip[]; stopTimes: StopTime[] } {
  console.log('[ESHOT] Converting data to database models...');

  // 1. Convert routes
  const routes: Route[] = rawRoutes.map(r => ({
    id: `bus_${r.HAT_NO}`,
    shortName: String(r.HAT_NO),
    longName: r.HAT_ADI || `${r.HAT_BASLANGIC} - ${r.HAT_BITIS}`,
    type: 3, // bus
    color: ESHOT_BUS_COLOR,
    textColor: ESHOT_TEXT_COLOR,
  }));

  // Build a set of valid route numbers for quick lookup
  const validRouteNums = new Set(rawRoutes.map(r => String(r.HAT_NO)));

  // 2. Convert stops
  const stops: Stop[] = rawStops
    .filter(s => s.ENLEM && s.BOYLAM && s.ENLEM !== 0 && s.BOYLAM !== 0)
    .map(s => ({
      id: `bus_${s.DURAK_ID}`,
      name: s.DURAK_ADI || `Durak ${s.DURAK_ID}`,
      lat: Number(s.ENLEM),
      lon: Number(s.BOYLAM),
      locationType: 0,
    }));

  // 3. Build route → stops mapping from DURAKTAN_GECEN_HATLAR
  const routeStopsMap = new Map<string, string[]>(); // routeNum → [bus_stopId, ...]

  for (const rawStop of rawStops) {
    if (!rawStop.DURAKTAN_GECEN_HATLAR || !rawStop.ENLEM || !rawStop.BOYLAM) continue;

    const routeNums = parseRoutesAtStop(rawStop.DURAKTAN_GECEN_HATLAR);
    const stopId = `bus_${rawStop.DURAK_ID}`;

    for (const routeNum of routeNums) {
      if (!validRouteNums.has(routeNum)) continue;

      if (!routeStopsMap.has(routeNum)) {
        routeStopsMap.set(routeNum, []);
      }
      routeStopsMap.get(routeNum)!.push(stopId);
    }
  }

  console.log(`[ESHOT] Route-stop mappings: ${routeStopsMap.size} routes with stops`);

  // Log some stats
  let totalStopAssignments = 0;
  routeStopsMap.forEach(stops => { totalStopAssignments += stops.length; });
  const avgStopsPerRoute = routeStopsMap.size > 0
    ? Math.round(totalStopAssignments / routeStopsMap.size)
    : 0;
  console.log(`[ESHOT] Average stops per route: ${avgStopsPerRoute}`);

  // 4. Group schedules by route
  const schedulesByRoute = new Map<number, EshotRawSchedule[]>();
  for (const sched of rawSchedules) {
    if (!schedulesByRoute.has(sched.HAT_NO)) {
      schedulesByRoute.set(sched.HAT_NO, []);
    }
    schedulesByRoute.get(sched.HAT_NO)!.push(sched);
  }

  // Sort each route's schedules by SIRA (sequence)
  schedulesByRoute.forEach(scheds => {
    scheds.sort((a, b) => a.SIRA - b.SIRA);
  });

  // 5. Create trips and stop_times
  const trips: Trip[] = [];
  const stopTimes: StopTime[] = [];

  // Also build route info map for headsigns
  const routeInfoMap = new Map<number, EshotRawRoute>();
  for (const r of rawRoutes) {
    routeInfoMap.set(r.HAT_NO, r);
  }

  let routesWithData = 0;
  let routesSkipped = 0;

  for (const rawRoute of rawRoutes) {
    const routeNum = String(rawRoute.HAT_NO);
    const routeId = `bus_${rawRoute.HAT_NO}`;
    const stopsOnRoute = routeStopsMap.get(routeNum) || [];
    const schedules = schedulesByRoute.get(rawRoute.HAT_NO) || [];

    if (stopsOnRoute.length === 0 || schedules.length === 0) {
      routesSkipped++;
      continue;
    }

    routesWithData++;

    // Select evenly spaced departures to limit data volume
    const step = Math.max(1, Math.floor(schedules.length / MAX_DEPARTURES_PER_ROUTE));
    const selectedSchedules = schedules
      .filter((_, idx) => idx % step === 0)
      .slice(0, MAX_DEPARTURES_PER_ROUTE);

    for (const sched of selectedSchedules) {
      // Going direction (GIDIS)
      const goTime = normalizeTime(sched.GIDIS_SAATI);
      if (goTime) {
        const tripId = `bus_${rawRoute.HAT_NO}_g_${sched.SIRA}`;
        trips.push({
          id: tripId,
          routeId,
          serviceId: 'weekday',
          headsign: rawRoute.HAT_BITIS || rawRoute.HAT_ADI,
          directionId: 0,
        });

        for (let i = 0; i < stopsOnRoute.length; i++) {
          stopTimes.push({
            tripId,
            arrivalTime: goTime,
            departureTime: goTime,
            stopId: stopsOnRoute[i],
            stopSequence: i,
          });
        }
      }

      // Return direction (DONUS)
      const retTime = normalizeTime(sched.DONUS_SAATI);
      if (retTime) {
        const tripId = `bus_${rawRoute.HAT_NO}_d_${sched.SIRA}`;
        trips.push({
          id: tripId,
          routeId,
          serviceId: 'weekday',
          headsign: rawRoute.HAT_BASLANGIC || rawRoute.HAT_ADI,
          directionId: 1,
        });

        for (let i = 0; i < stopsOnRoute.length; i++) {
          stopTimes.push({
            tripId,
            arrivalTime: retTime,
            departureTime: retTime,
            stopId: stopsOnRoute[i],
            stopSequence: i,
          });
        }
      }
    }
  }

  console.log(`[ESHOT] Routes with schedule data: ${routesWithData}, skipped: ${routesSkipped}`);
  console.log(`[ESHOT] Created ${trips.length} trips, ${stopTimes.length} stop_times`);

  return { stops, routes, trips, stopTimes };
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Download and import ESHOT bus data into the database
 * Fetches from İzmir open data portal (CKAN API)
 */
export async function downloadAndImportEshot(
  onProgress?: (stage: string, progress: number) => void
): Promise<{ stops: number; routes: number; trips: number; stopTimes: number }> {
  console.log('[ESHOT] Starting ESHOT bus data import...');

  try {
    // Step 1: Fetch routes (small, fast)
    onProgress?.('downloading', 0);
    const rawRoutes = await fetchEshotRoutes();
    onProgress?.('downloading', 0.05);

    // Step 2: Fetch stops (medium, ~12K records)
    const rawStops = await fetchEshotStops((loaded, total) => {
      onProgress?.('downloading', 0.05 + 0.25 * (loaded / Math.max(total, 1)));
    });
    onProgress?.('downloading', 0.3);

    // Step 3: Fetch weekday schedules (large, ~75K records)
    const rawSchedules = await fetchEshotSchedules((loaded, total) => {
      onProgress?.('downloading', 0.3 + 0.35 * (loaded / Math.max(total, 1)));
    });
    onProgress?.('downloading', 0.65);

    // Step 4: Convert to database models
    onProgress?.('parsing', 0.65);
    const { stops, routes, trips, stopTimes } = convertToModels(rawRoutes, rawStops, rawSchedules);
    onProgress?.('parsing', 0.7);

    // Step 5: Insert into database (append mode, don't clear)
    onProgress?.('importing', 0.7);

    console.log('[ESHOT] Inserting routes...');
    await db.insertRoutes(routes);
    onProgress?.('importing', 0.72);

    console.log('[ESHOT] Inserting stops...');
    await db.insertStops(stops);
    onProgress?.('importing', 0.78);

    console.log('[ESHOT] Inserting trips...');
    // Insert trips in batches (can be large)
    const tripBatchSize = 10000;
    for (let i = 0; i < trips.length; i += tripBatchSize) {
      const batch = trips.slice(i, i + tripBatchSize);
      await db.insertTrips(batch);
    }
    onProgress?.('importing', 0.82);

    console.log('[ESHOT] Inserting stop times...');
    const stBatchSize = 10000;
    for (let i = 0; i < stopTimes.length; i += stBatchSize) {
      const batch = stopTimes.slice(i, i + stBatchSize);
      await db.insertStopTimes(batch);
      const progress = 0.82 + 0.18 * (i / Math.max(stopTimes.length, 1));
      onProgress?.('importing', progress);
    }

    onProgress?.('importing', 1);

    const result = {
      stops: stops.length,
      routes: routes.length,
      trips: trips.length,
      stopTimes: stopTimes.length,
    };

    console.log('[ESHOT] ✅ Import complete:', result);
    return result;
  } catch (error) {
    console.error('[ESHOT] ❌ Import failed:', error);
    throw new Error(`ESHOT bus data import failed: ${error}`);
  }
}
