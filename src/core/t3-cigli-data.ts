/**
 * T3 Cigli Tram - Manual GTFS Data
 *
 * The official tram GTFS at tramizmir.com hasn't been updated since Dec 2022,
 * before T3 opened (Jan 27, 2024). This file provides T3 data built from
 * OpenStreetMap station coordinates and official timetables from tramizmir.com.
 *
 * T3 operates as two circular ring lines:
 * - Red (Outer/Dis): Flamingo -> all 14 stations -> Flamingo (counter-clockwise)
 * - Blue (Inner/Ic): Flamingo -> 13 stations (skip Katip Celebi) -> Flamingo (clockwise)
 *
 * Schedule (same every day):
 * - Red: 06:00-00:20, every 20 min
 * - Blue: 06:00-19:00 every 17 min, 19:00-00:20 every 34 min
 *
 * Sources:
 * - Station coordinates: OpenStreetMap (verified Jan 2026)
 * - Timetables: tramizmir.com official schedules
 * - Route info: Wikipedia T3 (Izmir Tramvayi)
 */

import type { Stop, Route, Trip, StopTime } from './types/models';

// T3 station data from OpenStreetMap
const T3_STATIONS = [
  { id: 1, name: 'Flamingo', lat: 38.4861316, lon: 27.0595511 },
  { id: 2, name: 'Semra Aksu', lat: 38.4923579, lon: 27.0615902 },
  { id: 3, name: 'Eski Havaalani', lat: 38.4931033, lon: 27.0570181 },
  { id: 4, name: 'Yenimahalle', lat: 38.4938238, lon: 27.0507739 },
  { id: 5, name: 'Cigli Bolge Hastanesi', lat: 38.4975320, lon: 27.0486446 },
  { id: 6, name: 'Ata Sanayi', lat: 38.5021055, lon: 27.0454856 },
  { id: 7, name: 'Evka 5', lat: 38.5062542, lon: 27.0426469 },
  { id: 8, name: 'Katip Celebi Universitesi', lat: 38.5070615, lon: 27.0301681 },
  { id: 9, name: 'IAOSB Nedim Uysal Lisesi', lat: 38.5041945, lon: 27.0372442 },
  { id: 10, name: 'Mustafa Kemal Ataturk Bulvari', lat: 38.4971874, lon: 27.0370350 },
  { id: 11, name: 'IAOSB Mudurlugu', lat: 38.4919500, lon: 27.0368470 },
  { id: 12, name: 'Kemal Baysak', lat: 38.4868538, lon: 27.0364871 },
  { id: 13, name: 'Nihat Karakartal', lat: 38.4859767, lon: 27.0457947 },
  { id: 14, name: 'Nazim Hikmet Ran', lat: 38.4858914, lon: 27.0525670 },
] as const;

// Red (Outer) line: counter-clockwise full ring through all 14 stations
const RED_STOP_SEQUENCE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1];

// Blue (Inner) line: clockwise ring, skips Katip Celebi Universitesi (#8)
const BLUE_STOP_SEQUENCE = [1, 14, 13, 12, 11, 10, 9, 7, 6, 5, 4, 3, 2, 1];

const TRIP_DURATION_MINUTES = 21;
const SERVICE_START = 6 * 60; // 06:00
const SERVICE_END = 24 * 60 + 20; // 00:20 next day

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
 * Generate trips and stop_times for a route based on frequency intervals
 */
function generateTripsForRoute(
  routeId: string,
  stopSequence: number[],
  directionId: number,
  headsign: string,
  frequencies: { start: number; end: number; interval: number }[],
): { trips: Trip[]; stopTimes: StopTime[] } {
  const trips: Trip[] = [];
  const stopTimes: StopTime[] = [];

  let tripIndex = 0;
  const numSegments = stopSequence.length - 1;
  const timePerSegment = TRIP_DURATION_MINUTES / numSegments;

  for (const freq of frequencies) {
    let departureMinutes = freq.start;
    while (departureMinutes + TRIP_DURATION_MINUTES <= freq.end + freq.interval) {
      // Don't start trips that would finish well past service end
      if (departureMinutes > SERVICE_END) break;

      const tripId = `${routeId}_${tripIndex}`;

      trips.push({
        id: tripId,
        routeId,
        serviceId: 'T3_DAILY',
        headsign,
        directionId,
      });

      for (let seq = 0; seq < stopSequence.length; seq++) {
        const time = departureMinutes + seq * timePerSegment;
        const timeStr = formatTime(time);
        stopTimes.push({
          tripId,
          arrivalTime: timeStr,
          departureTime: timeStr,
          stopId: `tram_t3_${stopSequence[seq]}`,
          stopSequence: seq + 1,
        });
      }

      departureMinutes += freq.interval;
      tripIndex++;
    }
  }

  return { trips, stopTimes };
}

/**
 * Generate complete T3 Cigli tram GTFS data
 * Returns data with tram_ prefix already applied (ready for DB insertion)
 */
export function generateT3CigliData(): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
} {
  // Stops (prefixed with tram_t3_ to avoid collision with T1/T2 stops tram_1..tram_39)
  const stops: Stop[] = T3_STATIONS.map(s => ({
    id: `tram_t3_${s.id}`,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    locationType: 0,
  }));

  // Routes
  const routes: Route[] = [
    {
      id: 'tram_t3_red',
      shortName: 'T3',
      longName: 'Cigli Ring - Dis Hat (Kirmizi)',
      type: 0, // tram
      color: '#9B59B6',
      textColor: '#FFFFFF',
    },
    {
      id: 'tram_t3_blue',
      shortName: 'T3',
      longName: 'Cigli Ring - Ic Hat (Mavi)',
      type: 0, // tram
      color: '#9B59B6',
      textColor: '#FFFFFF',
    },
  ];

  // Red (Outer) line: 06:00-00:20, every 20 min
  const red = generateTripsForRoute(
    'tram_t3_red',
    RED_STOP_SEQUENCE,
    0,
    'Flamingo (Dis Hat)',
    [{ start: SERVICE_START, end: SERVICE_END, interval: 20 }],
  );

  // Blue (Inner) line: 06:00-19:00 every 17 min, 19:00-00:20 every 34 min
  const blue = generateTripsForRoute(
    'tram_t3_blue',
    BLUE_STOP_SEQUENCE,
    1,
    'Flamingo (Ic Hat)',
    [
      { start: SERVICE_START, end: 19 * 60, interval: 17 },
      { start: 19 * 60, end: SERVICE_END, interval: 34 },
    ],
  );

  return {
    stops,
    routes,
    trips: [...red.trips, ...blue.trips],
    stopTimes: [...red.stopTimes, ...blue.stopTimes],
  };
}
