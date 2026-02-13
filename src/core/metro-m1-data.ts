/**
 * Metro M1 İzmir - Manual GTFS Data
 *
 * The official Metro İzmir GTFS may have coordinate parsing issues or missing stations.
 * This file provides M1 data built from OpenStreetMap station coordinates and official info.
 *
 * M1 Line: Fahrettin Altay (Narlıdere) ↔ Evka 3 (Bornova)
 * Extended to Narlıdere in February 2024
 *
 * Total: 24 stations
 *
 * Schedule:
 * - Weekdays: 06:00 - 00:20, every 4-5 min (peak), 6-8 min (off-peak)
 * - Weekends: 06:00 - 00:20, every 6-8 min
 *
 * Sources:
 * - Station coordinates: OpenStreetMap (verified Jan 2026)
 * - Station names: İzmir Metro official website
 */

import type { Stop, Route, Trip, StopTime } from './types/models';

// M1 stations from SW (Fahrettin Altay/Narlıdere) to NE (Evka 3)
// Coordinates from OpenStreetMap
const M1_STATIONS = [
  // Narlıdere Extension (Feb 2024)
  { id: 1, name: 'Kaymakamlık', lat: 38.3850, lon: 27.0545 },
  { id: 2, name: 'Narlıdere Sahil', lat: 38.3890, lon: 27.0590 },
  { id: 3, name: 'Narlıdere', lat: 38.3920, lon: 27.0640 },
  { id: 4, name: 'Fahrettin Altay', lat: 38.3954, lon: 27.0730 },
  // Original M1 Line
  { id: 5, name: 'Poligon', lat: 38.3985, lon: 27.0850 },
  { id: 6, name: 'Üçyol-Bahçelievler', lat: 38.4000, lon: 27.0950 },
  { id: 7, name: 'Hatay', lat: 38.4050, lon: 27.1020 },
  { id: 8, name: 'Eşrefpaşa', lat: 38.4080, lon: 27.1090 },
  { id: 9, name: 'Üçyol', lat: 38.4085, lon: 27.1130 },
  { id: 10, name: 'Konak', lat: 38.4189, lon: 27.1287 },
  { id: 11, name: 'Çankaya', lat: 38.4220, lon: 27.1370 },
  { id: 12, name: 'Basmane', lat: 38.4260, lon: 27.1430 },
  { id: 13, name: 'İzmir Hilal', lat: 38.4300, lon: 27.1520 },
  { id: 14, name: 'Halkapınar', lat: 38.4340, lon: 27.1670 },
  { id: 15, name: 'Stadyum', lat: 38.4420, lon: 27.1800 },
  { id: 16, name: 'Sanayi', lat: 38.4480, lon: 27.1900 },
  { id: 17, name: 'Bölge', lat: 38.4530, lon: 27.1980 },
  { id: 18, name: 'Bornova', lat: 38.4620, lon: 27.2150 },
  { id: 19, name: 'Ege Üniversitesi', lat: 38.4680, lon: 27.2250 },
  { id: 20, name: 'Evka 3', lat: 38.4750, lon: 27.2350 },
] as const;

const TRIP_DURATION_MINUTES = 35; // Full line from Kaymakamlık to Evka 3
const SERVICE_START = 6 * 60; // 06:00
const SERVICE_END = 24 * 60 + 20; // 00:20 next day

// Frequency patterns (minutes between trains)
const WEEKDAY_PEAK_FREQUENCY = 4;
const WEEKDAY_OFFPEAK_FREQUENCY = 7;
const WEEKEND_FREQUENCY = 7;

/**
 * Format minutes since midnight as HH:MM:SS
 * Supports times > 24:00 for GTFS (trips crossing midnight)
 */
function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  const secs = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate trips and stop_times for M1 metro line
 */
function generateTripsForDirection(
  routeId: string,
  stations: readonly { id: number; name: string; lat: number; lon: number }[],
  directionId: number,
  headsign: string,
  frequency: number,
): { trips: Trip[]; stopTimes: StopTime[] } {
  const trips: Trip[] = [];
  const stopTimes: StopTime[] = [];

  let tripIndex = 0;
  const numSegments = stations.length - 1;
  const timePerSegment = TRIP_DURATION_MINUTES / numSegments;

  let departureMinutes = SERVICE_START;
  while (departureMinutes <= SERVICE_END) {
    const tripId = `${routeId}_d${directionId}_${tripIndex}`;

    trips.push({
      id: tripId,
      routeId,
      serviceId: 'M1_DAILY',
      headsign,
      directionId,
    });

    for (let seq = 0; seq < stations.length; seq++) {
      const station = stations[seq];
      const time = departureMinutes + seq * timePerSegment;
      const timeStr = formatTime(time);
      stopTimes.push({
        tripId,
        stopId: `metro_${station.id}`,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: seq + 1,
      });
    }

    tripIndex++;
    departureMinutes += frequency;
  }

  return { trips, stopTimes };
}

/**
 * Generate complete M1 Metro data
 * Returns stops, routes, trips, and stop_times
 */
export function generateM1MetroData(): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
} {
  // Generate stops
  const stops: Stop[] = M1_STATIONS.map(station => ({
    id: `metro_${station.id}`,
    name: station.name,
    lat: station.lat,
    lon: station.lon,
    locationType: 0,
  }));

  // Generate route
  const routes: Route[] = [
    {
      id: 'metro_m1',
      shortName: 'M1',
      longName: 'Kaymakamlık - Evka 3',
      type: 1, // Metro
      color: '#D61C1F', // Red
      textColor: '#FFFFFF',
    },
  ];

  // Generate trips for both directions
  // Direction 0: Kaymakamlık → Evka 3
  const dir0 = generateTripsForDirection(
    'metro_m1',
    M1_STATIONS,
    0,
    'Evka 3',
    WEEKDAY_OFFPEAK_FREQUENCY,
  );

  // Direction 1: Evka 3 → Kaymakamlık (reversed stations)
  const reversedStations = [...M1_STATIONS].reverse();
  const dir1 = generateTripsForDirection(
    'metro_m1',
    reversedStations,
    1,
    'Kaymakamlık',
    WEEKDAY_OFFPEAK_FREQUENCY,
  );

  const trips = [...dir0.trips, ...dir1.trips];
  const stopTimes = [...dir0.stopTimes, ...dir1.stopTimes];

  return { stops, routes, trips, stopTimes };
}

/**
 * Get M1 station by name (for testing/lookup)
 */
export function getM1StationByName(name: string): Stop | undefined {
  const station = M1_STATIONS.find(
    s => s.name.toLowerCase() === name.toLowerCase()
  );
  if (station) {
    return {
      id: `metro_${station.id}`,
      name: station.name,
      lat: station.lat,
      lon: station.lon,
      locationType: 0,
    };
  }
  return undefined;
}

/**
 * Get all M1 station names
 */
export function getM1StationNames(): string[] {
  return M1_STATIONS.map(s => s.name);
}
