import { XMLParser } from 'fast-xml-parser';
import { cache } from '../../core/cache';
import type { NextDeparture } from '../../core/types/adapter';

const SIRI_BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring';
const API_KEY = process.env.EXPO_PUBLIC_IDFM_API_KEY || '';

const CACHE_TTL = 30000; // 30 secondes

export async function fetchNextDepartures(stopId: string): Promise<NextDeparture[]> {
  // 1. Check cache
  const cacheKey = `departures_${stopId}`;
  const cached = cache.get<NextDeparture[]>(cacheKey, CACHE_TTL);
  if (cached) return cached;

  // 2. Convertit stop_id GTFS en format SIRI
  const siriStopId = `STIF:StopPoint:Q:${stopId}:`;

  // 3. Appel API
  const url = `${SIRI_BASE_URL}?MonitoringRef=${encodeURIComponent(siriStopId)}`;

  const response = await fetch(url, {
    headers: {
      'apikey': API_KEY,
      'Accept': 'application/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`SIRI API error: ${response.status}`);
  }

  const xml = await response.text();

  // 4. Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const parsed = parser.parse(xml);

  // 5. Extrait les départs
  const deliveries = parsed?.Siri?.ServiceDelivery?.StopMonitoringDelivery;
  if (!deliveries) return [];

  const visits = deliveries.MonitoredStopVisit;
  if (!visits) return [];

  const visitsArray = Array.isArray(visits) ? visits : [visits];

  // 6. Normalise vers NextDeparture[]
  const departures: NextDeparture[] = visitsArray.map((visit: any) => {
    const journey = visit.MonitoredVehicleJourney;
    const call = journey?.MonitoredCall;

    const expectedTime = call?.ExpectedDepartureTime;
    const aimedTime = call?.AimedDepartureTime;

    const departureTime = new Date(expectedTime || aimedTime);
    const scheduledTime = aimedTime ? new Date(aimedTime) : undefined;

    // Calcul du retard en secondes
    let delay = 0;
    if (expectedTime && aimedTime) {
      delay = Math.round((new Date(expectedTime).getTime() - new Date(aimedTime).getTime()) / 1000);
    }

    return {
      tripId: journey?.FramedVehicleJourneyRef?.DatedVehicleJourneyRef || '',
      routeId: journey?.LineRef || '',
      routeShortName: journey?.PublishedLineName || '',
      headsign: journey?.DestinationName || '',
      departureTime,
      scheduledTime,
      isRealtime: !!expectedTime,
      delay,
    };
  });

  // 7. Trie par heure de départ et limite à 10
  const sorted = departures
    .filter(d => d.departureTime > new Date())
    .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())
    .slice(0, 10);

  // 8. Cache le résultat
  cache.set(cacheKey, sorted);

  return sorted;
}
