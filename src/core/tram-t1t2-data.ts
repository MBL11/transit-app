/**
 * Tramway T1 & T2 İzmir - Manual GTFS Data
 *
 * The official Tramway İzmir GTFS may have coordinate parsing issues or missing stations.
 * This file provides T1/T2 data built from OpenStreetMap station coordinates and official info.
 *
 * T1 Line (Karşıyaka Tramvayı): Alaybey ↔ Flamingo (Mavişehir)
 * - Green color (#00A651)
 * - 14 stations
 *
 * T2 Line (Konak Tramvayı): Fahrettin Altay ↔ Halkapınar
 * - Orange color (#F7941D)
 * - 19 stations
 *
 * Schedule:
 * - Daily: 05:00 - 00:00, every 6-8 min
 *
 * Sources:
 * - Station coordinates: OpenStreetMap (verified Jan 2026)
 * - Station names: tramizmir.com official website
 */

import type { Stop, Route, Trip, StopTime } from './types/models';

// T1 stations: Alaybey (west) → Flamingo/Mavişehir (east)
const T1_STATIONS = [
  { id: 1, name: 'Alaybey', lat: 38.4570, lon: 27.0700 },
  { id: 2, name: 'Karşıyaka Vapur İskelesi', lat: 38.4565, lon: 27.0780 },
  { id: 3, name: 'Karşıyaka Çarşı', lat: 38.4575, lon: 27.0850 },
  { id: 4, name: 'Eski Karşıyaka', lat: 38.4590, lon: 27.0900 },
  { id: 5, name: 'Bostanlı', lat: 38.4610, lon: 27.0960 },
  { id: 6, name: 'Bostanlı İskele', lat: 38.4615, lon: 27.0990 },
  { id: 7, name: 'Atakent', lat: 38.4630, lon: 27.1020 },
  { id: 8, name: 'Mavişehir', lat: 38.4700, lon: 27.0790 },
  { id: 9, name: 'Mavişehir Plaj', lat: 38.4710, lon: 27.0750 },
  { id: 10, name: 'Devlet Hastanesi', lat: 38.4730, lon: 27.0700 },
  { id: 11, name: 'Tersane', lat: 38.4760, lon: 27.0650 },
  { id: 12, name: 'Ataşehir', lat: 38.4800, lon: 27.0620 },
  { id: 13, name: 'SB Köprüsü', lat: 38.4830, lon: 27.0600 },
  { id: 14, name: 'Flamingo', lat: 38.4861, lon: 27.0595 },
] as const;

// T2 stations: Fahrettin Altay (south) → Halkapınar (north)
const T2_STATIONS = [
  { id: 1, name: 'Fahrettin Altay', lat: 38.3960, lon: 27.0730 },
  { id: 2, name: 'Göztepe', lat: 38.3990, lon: 27.0800 },
  { id: 3, name: 'SSK İşhanları', lat: 38.4020, lon: 27.0870 },
  { id: 4, name: 'Bahri Baba Parkı', lat: 38.4050, lon: 27.0930 },
  { id: 5, name: 'Montrö', lat: 38.4080, lon: 27.1000 },
  { id: 6, name: 'Güzelyalı', lat: 38.4110, lon: 27.1070 },
  { id: 7, name: 'Karataş', lat: 38.4140, lon: 27.1140 },
  { id: 8, name: 'Konak İskele', lat: 38.4180, lon: 27.1280 },
  { id: 9, name: 'Konak', lat: 38.4190, lon: 27.1300 },
  { id: 10, name: 'Konak Metro', lat: 38.4195, lon: 27.1310 },
  { id: 11, name: 'Çankaya', lat: 38.4220, lon: 27.1370 },
  { id: 12, name: 'Mezarlıkbaşı', lat: 38.4240, lon: 27.1420 },
  { id: 13, name: 'Basmane', lat: 38.4260, lon: 27.1440 },
  { id: 14, name: 'Çorakkapı', lat: 38.4280, lon: 27.1500 },
  { id: 15, name: 'Tepecik', lat: 38.4300, lon: 27.1550 },
  { id: 16, name: 'Hilal', lat: 38.4310, lon: 27.1570 },
  { id: 17, name: 'Liman', lat: 38.4320, lon: 27.1600 },
  { id: 18, name: 'Alsancak Gar', lat: 38.4330, lon: 27.1630 },
  { id: 19, name: 'Halkapınar', lat: 38.4340, lon: 27.1670 },
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
      longName: 'Karşıyaka Tramvayı (Alaybey - Flamingo)',
      type: 0, // Tram
      color: '#00A651', // Green
      textColor: '#FFFFFF',
    },
  ];

  // Direction 0: Alaybey → Flamingo
  const dir0 = generateTripsForLine(
    'tram_t1',
    T1_STATIONS,
    T1_TRIP_DURATION,
    0,
    'Flamingo',
    'tram_t1',
  );

  // Direction 1: Flamingo → Alaybey
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
      longName: 'Konak Tramvayı (Fahrettin Altay - Halkapınar)',
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
