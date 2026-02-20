/**
 * Tramway T1 & T2 İzmir - Manual GTFS Data
 *
 * This file provides T1/T2 data using official GTFS coordinates from tramizmir.com.
 *
 * T1 Line (Karşıyaka Tramvayı): Alaybey ↔ Ataşehir
 * - Green color (#00A651)
 * - 14 stations (via Mavişehir)
 *
 * T2 Line (Konak Tramvayı): Fahrettin Altay ↔ Halkapınar
 * - Orange color (#F7941D)
 * - 19 stations (via Konak İskele)
 *
 * Schedule:
 * - Daily: 05:00 - 00:00, every 6-8 min
 *
 * Sources:
 * - Station coordinates: Official GTFS from tramizmir.com
 * - Station names: tramizmir.com official website
 */

import type { Stop, Route, Trip, StopTime } from './types/models';

// T1 stations: Alaybey (east) → Mavişehir/Ataşehir (west) - Official GTFS coordinates
// KARŞIYAKA TRAMVAYI YEŞİL HAT - 14 stations
// Note: GTFS shows route ending at Ataşehir, tramizmir.com says Flamingo (Mavişehir area)
const T1_STATIONS = [
  { id: 1, name: 'Alaybey', lat: 38.460163, lon: 27.127175 },
  { id: 2, name: 'Karşıyaka İskele', lat: 38.454877, lon: 27.119475 },
  { id: 3, name: 'Nikah Sarayı', lat: 38.44973, lon: 27.11043 },
  { id: 4, name: 'Yunuslar', lat: 38.451636, lon: 27.103497 },
  { id: 5, name: 'Bostanlı İskele', lat: 38.454486, lon: 27.097641 },
  { id: 6, name: 'Çarşı', lat: 38.458163, lon: 27.094494 },
  { id: 7, name: 'Vilayet Evi', lat: 38.460544, lon: 27.090166 },
  { id: 8, name: 'Selçuk Yaşar', lat: 38.463569, lon: 27.085941 },
  { id: 9, name: 'Atakent', lat: 38.467855, lon: 27.087852 },
  { id: 10, name: 'Bilim Müzesi', lat: 38.47408, lon: 27.082408 },
  { id: 11, name: 'Mustafa Kemal Spor Salonu', lat: 38.475252, lon: 27.074688 },
  { id: 12, name: 'Mavişehir', lat: 38.475247, lon: 27.067936 },
  { id: 13, name: 'Çevreyolu', lat: 38.479266, lon: 27.065741 },
  { id: 14, name: 'Ataşehir', lat: 38.47965, lon: 27.073063 },
] as const;

// T2 stations: Fahrettin Altay (south) → Halkapınar (north) - Official GTFS coordinates
// KONAK TRAMVAYI - 19 stations
const T2_STATIONS = [
  { id: 1, name: 'Fahrettin Altay', lat: 38.397748, lon: 27.069416 },
  { id: 2, name: 'Üçkuyular', lat: 38.403083, lon: 27.071412 },
  { id: 3, name: 'AASSM', lat: 38.400658, lon: 27.077813 },
  { id: 4, name: 'Güzelyalı', lat: 38.399439, lon: 27.083008 },
  { id: 5, name: 'Göztepe', lat: 38.400627, lon: 27.091575 },
  { id: 6, name: 'Sadıkbey', lat: 38.403157, lon: 27.095324 },
  { id: 7, name: 'Köprü', lat: 38.405995, lon: 27.098494 },
  { id: 8, name: 'Karantina', lat: 38.407877, lon: 27.10663 },
  { id: 9, name: 'Karataş', lat: 38.410526, lon: 27.118776 },
  { id: 10, name: 'Konak İskele', lat: 38.418751, lon: 27.12726 },
  { id: 11, name: 'Gazi Bulvarı', lat: 38.424135, lon: 27.137266 },
  { id: 12, name: 'Kültürpark', lat: 38.429332, lon: 27.1416 },
  { id: 13, name: 'Hocazade Camii', lat: 38.433438, lon: 27.144387 },
  { id: 14, name: 'Atatürk Spor Salonu', lat: 38.433994, lon: 27.147023 },
  { id: 15, name: 'Alsancak Gar', lat: 38.439586, lon: 27.148271 },
  { id: 16, name: 'Alsancak Stadyumu', lat: 38.438149, lon: 27.151959 },
  { id: 17, name: 'Havagazı', lat: 38.439858, lon: 27.158134 },
  { id: 18, name: 'Üniversite', lat: 38.437203, lon: 27.160767 },
  { id: 19, name: 'Halkapınar', lat: 38.433952, lon: 27.171507 },
] as const;

const T1_TRIP_DURATION = 25; // minutes
const T2_TRIP_DURATION = 35; // minutes
const SERVICE_START = 5 * 60; // 05:00
const SERVICE_END = 24 * 60; // 00:00
const FREQUENCY = 7; // every 7 minutes on average

/**
 * Format minutes since midnight as HH:MM:SS
 */
function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  const secs = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate trips and stop_times for a tram line
 */
function generateTripsForLine(
  routeId: string,
  stations: readonly { id: number; name: string; lat: number; lon: number }[],
  tripDuration: number,
  directionId: number,
  headsign: string,
  prefix: string,
): { trips: Trip[]; stopTimes: StopTime[] } {
  const trips: Trip[] = [];
  const stopTimes: StopTime[] = [];

  let tripIndex = 0;
  const numSegments = stations.length - 1;
  const timePerSegment = tripDuration / numSegments;

  let departureMinutes = SERVICE_START;
  while (departureMinutes <= SERVICE_END) {
    const tripId = `${routeId}_d${directionId}_${tripIndex}`;

    trips.push({
      id: tripId,
      routeId,
      serviceId: `${prefix}_DAILY`,
      headsign,
      directionId,
    });

    for (let seq = 0; seq < stations.length; seq++) {
      const station = stations[seq];
      const time = departureMinutes + seq * timePerSegment;
      const timeStr = formatTime(time);
      stopTimes.push({
        tripId,
        stopId: `${prefix}_${station.id}`,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: seq + 1,
      });
    }

    tripIndex++;
    departureMinutes += FREQUENCY;
  }

  return { trips, stopTimes };
}

/**
 * Generate T1 Tramway data
 */
export function generateT1TramData(): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
} {
  const stops: Stop[] = T1_STATIONS.map(station => ({
    id: `tram_t1_${station.id}`,
    name: station.name,
    lat: station.lat,
    lon: station.lon,
    locationType: 0,
  }));

  const routes: Route[] = [
    {
      id: 'tram_t1',
      shortName: 'T1',
      longName: 'Karşıyaka Tramvayı Yeşil Hat (Alaybey - Ataşehir)',
      type: 0, // Tram
      color: '#00A651', // Green
      textColor: '#FFFFFF',
    },
  ];

  // Direction 0: Alaybey → Ataşehir
  const dir0 = generateTripsForLine(
    'tram_t1',
    T1_STATIONS,
    T1_TRIP_DURATION,
    0,
    'Ataşehir',
    'tram_t1',
  );

  // Direction 1: Ataşehir → Alaybey
  const reversedStations = [...T1_STATIONS].reverse();
  const dir1 = generateTripsForLine(
    'tram_t1',
    reversedStations,
    T1_TRIP_DURATION,
    1,
    'Alaybey',
    'tram_t1',
  );

  return {
    stops,
    routes,
    trips: [...dir0.trips, ...dir1.trips],
    stopTimes: [...dir0.stopTimes, ...dir1.stopTimes],
  };
}

/**
 * Generate T2 Tramway data
 */
export function generateT2TramData(): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
} {
  const stops: Stop[] = T2_STATIONS.map(station => ({
    id: `tram_t2_${station.id}`,
    name: station.name,
    lat: station.lat,
    lon: station.lon,
    locationType: 0,
  }));

  const routes: Route[] = [
    {
      id: 'tram_t2',
      shortName: 'T2',
      longName: 'Konak Tramvayı (Halkapınar - Fahrettin Altay)',
      type: 0, // Tram
      color: '#F7941D', // Orange
      textColor: '#FFFFFF',
    },
  ];

  // Direction 0: Fahrettin Altay → Halkapınar
  const dir0 = generateTripsForLine(
    'tram_t2',
    T2_STATIONS,
    T2_TRIP_DURATION,
    0,
    'Halkapınar',
    'tram_t2',
  );

  // Direction 1: Halkapınar → Fahrettin Altay
  const reversedStations = [...T2_STATIONS].reverse();
  const dir1 = generateTripsForLine(
    'tram_t2',
    reversedStations,
    T2_TRIP_DURATION,
    1,
    'Fahrettin Altay',
    'tram_t2',
  );

  return {
    stops,
    routes,
    trips: [...dir0.trips, ...dir1.trips],
    stopTimes: [...dir0.stopTimes, ...dir1.stopTimes],
  };
}

/**
 * Generate all T1 and T2 tramway data combined
 */
export function generateT1T2TramData(): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
} {
  const t1 = generateT1TramData();
  const t2 = generateT2TramData();

  return {
    stops: [...t1.stops, ...t2.stops],
    routes: [...t1.routes, ...t2.routes],
    trips: [...t1.trips, ...t2.trips],
    stopTimes: [...t1.stopTimes, ...t2.stopTimes],
  };
}

/**
 * Get T1 station by name
 */
export function getT1StationByName(name: string): Stop | undefined {
  const station = T1_STATIONS.find(
    s => s.name.toLowerCase() === name.toLowerCase()
  );
  if (station) {
    return {
      id: `tram_t1_${station.id}`,
      name: station.name,
      lat: station.lat,
      lon: station.lon,
      locationType: 0,
    };
  }
  return undefined;
}

/**
 * Get T2 station by name
 */
export function getT2StationByName(name: string): Stop | undefined {
  const station = T2_STATIONS.find(
    s => s.name.toLowerCase() === name.toLowerCase()
  );
  if (station) {
    return {
      id: `tram_t2_${station.id}`,
      name: station.name,
      lat: station.lat,
      lon: station.lon,
      locationType: 0,
    };
  }
  return undefined;
}

/**
 * Get all T1 station names
 */
export function getT1StationNames(): string[] {
  return T1_STATIONS.map(s => s.name);
}

/**
 * Get all T2 station names
 */
export function getT2StationNames(): string[] {
  return T2_STATIONS.map(s => s.name);
}
