import { XMLParser } from 'fast-xml-parser';
import { cache } from '../../core/cache';
import { captureException } from '../../services/crash-reporting';
import type { NextDeparture } from '../../core/types/adapter';

const SIRI_BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring';
const API_KEY = process.env.EXPO_PUBLIC_IDFM_API_KEY || '';

const CACHE_TTL = 30000; // 30 secondes
const REQUEST_TIMEOUT = 10000; // 10 secondes
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 seconde

// Log API key status at startup (once)
let apiKeyLogged = false;
function logApiKeyStatus() {
  if (apiKeyLogged) return;
  apiKeyLogged = true;
  if (!API_KEY) {
    console.warn('[SIRI] No API key configured - real-time data will be unavailable');
  } else {
    console.log('[SIRI] API key configured');
  }
}

/**
 * Convert GTFS stop_id to SIRI MonitoringRef format
 * IDFM uses several formats, we try multiple patterns
 */
function convertToSiriStopId(gtfsStopId: string): string[] {
  const candidates: string[] = [];

  // Clean the ID
  const cleanId = gtfsStopId.replace(/^IDFM:/, '').replace(/^StopPoint:/, '');

  // Format 1: Standard STIF format
  candidates.push(`STIF:StopPoint:Q:${cleanId}:`);

  // Format 2: If it's already a numeric ID
  if (/^\d+$/.test(cleanId)) {
    candidates.push(`STIF:StopPoint:Q:${cleanId}:`);
    // Try with leading zeros removed
    candidates.push(`STIF:StopPoint:Q:${parseInt(cleanId, 10)}:`);
  }

  // Format 3: IDFM format
  candidates.push(`IDFM:${cleanId}`);

  // Format 4: Direct MonitoringRef (some stops use this)
  if (gtfsStopId.includes(':')) {
    candidates.push(gtfsStopId);
  }

  return [...new Set(candidates)]; // Remove duplicates
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Try fetching departures with a specific SIRI stop ID
 */
async function tryFetchWithStopId(
  siriStopId: string,
  retryCount: number = 0
): Promise<NextDeparture[] | null> {
  const url = `${SIRI_BASE_URL}?MonitoringRef=${encodeURIComponent(siriStopId)}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          'apikey': API_KEY,
          'Accept': 'application/xml',
        },
      },
      REQUEST_TIMEOUT
    );

    if (!response.ok) {
      // 401/403 = API key issue, don't retry
      if (response.status === 401 || response.status === 403) {
        console.error('[SIRI] API key invalid or missing');
        return null;
      }
      // 404 = stop not found with this format, try next
      if (response.status === 404) {
        return null;
      }
      // 5xx = server error, retry
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY * (retryCount + 1));
        return tryFetchWithStopId(siriStopId, retryCount + 1);
      }
      throw new Error(`SIRI API error: ${response.status}`);
    }

    const xml = await response.text();

    // Parse XML with error handling
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    let parsed;
    try {
      parsed = parser.parse(xml);
    } catch (parseError) {
      console.error('[SIRI] XML parse error:', parseError);
      return null;
    }

    // Extract departures - handle different response structures
    const delivery = parsed?.Siri?.ServiceDelivery?.StopMonitoringDelivery;
    if (!delivery) {
      // Empty response, try next stop ID format
      return null;
    }

    // Handle both single and array responses
    const deliveryArray = Array.isArray(delivery) ? delivery : [delivery];

    // Check for error status in delivery
    for (const d of deliveryArray) {
      if (d.Status === 'false' || d.ErrorCondition) {
        console.warn('[SIRI] Delivery error:', d.ErrorCondition?.Description || 'Unknown');
        return null;
      }
    }

    // Collect all visits from all deliveries
    const allVisits: any[] = [];
    for (const d of deliveryArray) {
      const visits = d.MonitoredStopVisit;
      if (visits) {
        if (Array.isArray(visits)) {
          allVisits.push(...visits);
        } else {
          allVisits.push(visits);
        }
      }
    }

    if (allVisits.length === 0) {
      return null;
    }

    // Normalize to NextDeparture[]
    const departures: NextDeparture[] = [];
    for (const visit of allVisits) {
      try {
        const journey = visit.MonitoredVehicleJourney;
        if (!journey) continue;

        const call = journey.MonitoredCall;
        if (!call) continue;

        const expectedTime = call.ExpectedDepartureTime || call.ExpectedArrivalTime;
        const aimedTime = call.AimedDepartureTime || call.AimedArrivalTime;

        // Skip if no time information
        if (!expectedTime && !aimedTime) continue;

        const departureTime = new Date(expectedTime || aimedTime);

        // Skip invalid dates
        if (isNaN(departureTime.getTime())) continue;

        const scheduledTime = aimedTime ? new Date(aimedTime) : undefined;

        // Calculate delay in seconds
        let delay = 0;
        if (expectedTime && aimedTime) {
          const expected = new Date(expectedTime).getTime();
          const aimed = new Date(aimedTime).getTime();
          if (!isNaN(expected) && !isNaN(aimed)) {
            delay = Math.round((expected - aimed) / 1000);
          }
        }

        departures.push({
          tripId: journey.FramedVehicleJourneyRef?.DatedVehicleJourneyRef || '',
          routeId: journey.LineRef?.value || journey.LineRef || '',
          routeShortName: journey.PublishedLineName?.value || journey.PublishedLineName || '',
          headsign: journey.DestinationName?.value || journey.DestinationName || '',
          departureTime,
          scheduledTime,
          isRealtime: !!expectedTime,
          delay,
        });
      } catch (visitError) {
        // Skip malformed visit, continue with others
        console.warn('[SIRI] Error parsing visit:', visitError);
      }
    }

    return departures.length > 0 ? departures : null;
  } catch (error) {
    // Network error - retry if not aborted
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[SIRI] Request timeout for', siriStopId);
      } else if (retryCount < MAX_RETRIES) {
        console.warn(`[SIRI] Network error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await sleep(RETRY_DELAY * (retryCount + 1));
        return tryFetchWithStopId(siriStopId, retryCount + 1);
      }
    }
    return null;
  }
}

/**
 * Fetch next departures from SIRI API with improved reliability
 */
export async function fetchNextDepartures(stopId: string): Promise<NextDeparture[]> {
  logApiKeyStatus();

  // Skip if no API key
  if (!API_KEY) {
    return [];
  }

  // 1. Check cache
  const cacheKey = `departures_${stopId}`;
  const cached = cache.get<NextDeparture[]>(cacheKey, CACHE_TTL);
  if (cached) {
    return cached;
  }

  // 2. Try different stop ID formats
  const siriStopIds = convertToSiriStopId(stopId);

  let departures: NextDeparture[] | null = null;

  for (const siriStopId of siriStopIds) {
    departures = await tryFetchWithStopId(siriStopId);
    if (departures && departures.length > 0) {
      break;
    }
  }

  // 3. If all formats failed, return empty
  if (!departures || departures.length === 0) {
    // Cache empty result to avoid hammering the API
    cache.set(cacheKey, []);
    return [];
  }

  // 4. Sort by departure time and filter past departures
  const now = new Date();
  const sorted = departures
    .filter(d => d.departureTime > now)
    .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())
    .slice(0, 10);

  // 5. Cache the result
  cache.set(cacheKey, sorted);

  return sorted;
}

/**
 * Batch fetch departures for multiple stops (more efficient)
 */
export async function fetchDeparturesForStops(
  stopIds: string[]
): Promise<Map<string, NextDeparture[]>> {
  const results = new Map<string, NextDeparture[]>();

  // Fetch in parallel with concurrency limit
  const CONCURRENCY = 3;
  for (let i = 0; i < stopIds.length; i += CONCURRENCY) {
    const batch = stopIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (stopId) => {
        try {
          const departures = await fetchNextDepartures(stopId);
          return { stopId, departures };
        } catch (error) {
          captureException(error, {
            tags: { function: 'fetchDeparturesForStops' },
            extra: { stopId },
          });
          return { stopId, departures: [] };
        }
      })
    );

    for (const { stopId, departures } of batchResults) {
      results.set(stopId, departures);
    }
  }

  return results;
}
