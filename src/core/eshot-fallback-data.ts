/**
 * ESHOT Bus Fallback Data - Major İzmir Bus Routes
 *
 * Static fallback data for when the CKAN open data API (acikveri.bizizmir.com)
 * is unavailable. Covers ~25 major ESHOT bus routes serving key corridors:
 * - Airport connections (200, 202, 204)
 * - Otogar (bus terminal) connections (54, 302)
 * - Major urban corridors (5, 8, 23, 35, 104, 147, 505, 555)
 * - University & hospital routes (118, 285, 579)
 * - Cross-city connectors (620, 690, 740, 760, 820, 827, 916, 935)
 *
 * Stop coordinates are approximate, based on well-known İzmir landmarks.
 * Schedules are generated algorithmically based on typical ESHOT frequencies.
 *
 * Sources:
 * - Route info: eshot.gov.tr, nevakit.com, moovitapp.com
 * - Coordinates: OpenStreetMap, Google Maps (approximate)
 * - Schedules: Typical ESHOT frequencies (10-20 min peak, 20-30 min off-peak)
 */

import type { Stop, Route, Trip, StopTime } from './types/models';

// ESHOT official colors
const ESHOT_BUS_COLOR = '#0066CC';
const ESHOT_TEXT_COLOR = '#FFFFFF';

// ============================================================================
// STOP DATA - Major stops with approximate coordinates
// ============================================================================

interface StopData {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

// Key transfer hubs and major stops across İzmir
const ESHOT_STOPS: StopData[] = [
  // Konak / City Center
  { id: 10001, name: 'Konak', lat: 38.4189, lon: 27.1287 },
  { id: 10002, name: 'İskele', lat: 38.4215, lon: 27.1310 },
  { id: 10003, name: 'Borsa', lat: 38.4230, lon: 27.1330 },
  { id: 10004, name: 'Çardak', lat: 38.4250, lon: 27.1360 },
  { id: 10005, name: 'Basmane Gar', lat: 38.4260, lon: 27.1430 },
  { id: 10006, name: 'Kemer', lat: 38.4220, lon: 27.1380 },
  { id: 10007, name: 'Belediye Sarayı', lat: 38.4195, lon: 27.1250 },
  { id: 10008, name: 'Çankaya', lat: 38.4220, lon: 27.1370 },
  { id: 10009, name: 'Montrö', lat: 38.4200, lon: 27.1220 },
  { id: 10010, name: 'Cumhuriyet Meydanı', lat: 38.4210, lon: 27.1265 },

  // Eşrefpaşa / Karabağlar
  { id: 10011, name: 'Eşrefpaşa', lat: 38.4100, lon: 27.1200 },
  { id: 10012, name: 'Eşrefpaşa Hastanesi', lat: 38.4080, lon: 27.1160 },
  { id: 10013, name: 'Kestelli', lat: 38.4060, lon: 27.1120 },
  { id: 10014, name: 'Zincirlikuyu', lat: 38.4040, lon: 27.1080 },
  { id: 10015, name: 'Bozyaka Cami', lat: 38.4020, lon: 27.1050 },
  { id: 10016, name: 'Yağhaneler', lat: 38.4110, lon: 27.1180 },

  // Fahrettin Altay / Balçova / Narlıdere
  { id: 10020, name: 'Fahrettin Altay Meydan', lat: 38.3954, lon: 27.0730 },
  { id: 10021, name: 'Adnan Saygun Sanat Merkezi', lat: 38.3970, lon: 27.0760 },
  { id: 10022, name: 'Beyaz', lat: 38.3980, lon: 27.0790 },
  { id: 10023, name: 'Balçova İstasyon', lat: 38.3960, lon: 27.0820 },
  { id: 10024, name: 'Dokuz Eylül Hastanesi', lat: 38.3920, lon: 27.0650 },
  { id: 10025, name: 'Narlıdere Belediye', lat: 38.3900, lon: 27.0600 },
  { id: 10026, name: 'Kaymakamlık', lat: 38.3850, lon: 27.0545 },
  { id: 10027, name: 'Üçkuyular İskele', lat: 38.3990, lon: 27.0800 },
  { id: 10028, name: 'Hava Hastanesi', lat: 38.3965, lon: 27.0750 },

  // Üçyol / Buca
  { id: 10030, name: 'Üçyol', lat: 38.4085, lon: 27.1130 },
  { id: 10031, name: 'Şirinyer', lat: 38.4020, lon: 27.1250 },
  { id: 10032, name: 'Buca Merkez', lat: 38.3940, lon: 27.1420 },
  { id: 10033, name: 'Tınaztepe', lat: 38.3800, lon: 27.1600 },
  { id: 10034, name: 'Adatepe', lat: 38.3860, lon: 27.1500 },

  // Halkapınar / Bayraklı
  { id: 10040, name: 'Halkapınar', lat: 38.4340, lon: 27.1670 },
  { id: 10041, name: 'Halkapınar İZSU', lat: 38.4330, lon: 27.1650 },
  { id: 10042, name: 'Bayraklı', lat: 38.4450, lon: 27.1650 },
  { id: 10043, name: 'Yeni Girne', lat: 38.4500, lon: 27.1700 },
  { id: 10044, name: 'Turan', lat: 38.4480, lon: 27.1680 },

  // Bornova
  { id: 10050, name: 'Bornova Merkez Metro', lat: 38.4620, lon: 27.2150 },
  { id: 10051, name: 'Ege Üniversitesi', lat: 38.4680, lon: 27.2250 },
  { id: 10052, name: 'Evka 3 Metro', lat: 38.4750, lon: 27.2350 },
  { id: 10053, name: 'Evka 4', lat: 38.4810, lon: 27.2380 },
  { id: 10054, name: 'Bornova Stadyum', lat: 38.4600, lon: 27.2100 },

  // Karşıyaka
  { id: 10060, name: 'Karşıyaka İskele', lat: 38.4550, lon: 27.1200 },
  { id: 10061, name: 'Karşıyaka Çarşı', lat: 38.4560, lon: 27.1150 },
  { id: 10062, name: 'Alaybey', lat: 38.4600, lon: 27.1050 },
  { id: 10063, name: 'Bostanlı İskele', lat: 38.4560, lon: 27.0950 },
  { id: 10064, name: 'Mavişehir', lat: 38.4620, lon: 27.0780 },
  { id: 10065, name: 'Atakent', lat: 38.4640, lon: 27.0700 },

  // Çiğli
  { id: 10070, name: 'Çiğli', lat: 38.4950, lon: 27.0600 },
  { id: 10071, name: 'Çiğli Hastanesi', lat: 38.4980, lon: 27.0480 },
  { id: 10072, name: 'Sasalı', lat: 38.5100, lon: 27.0400 },

  // Menemen / Kuzey
  { id: 10075, name: 'Menemen', lat: 38.5900, lon: 27.0700 },
  { id: 10076, name: 'Menemen Merkez', lat: 38.5920, lon: 27.0680 },

  // Gaziemir / Havalimanı
  { id: 10080, name: 'Gaziemir', lat: 38.3240, lon: 27.1310 },
  { id: 10081, name: 'Gaziemir Alt Geçidi', lat: 38.3200, lon: 27.1350 },
  { id: 10082, name: 'Sarnıç', lat: 38.3100, lon: 27.1400 },
  { id: 10083, name: 'Havalimanı İç Hatlar', lat: 38.2920, lon: 27.1560 },
  { id: 10084, name: 'Havalimanı Dış Hatlar', lat: 38.2900, lon: 27.1580 },
  { id: 10085, name: 'Ege Serbest Bölge', lat: 38.3350, lon: 27.1280 },
  { id: 10086, name: 'Moda', lat: 38.3650, lon: 27.1050 },
  { id: 10087, name: 'Kolej', lat: 38.3180, lon: 27.1370 },

  // Otogar
  { id: 10090, name: 'Otogar', lat: 38.4380, lon: 27.1790 },
  { id: 10091, name: 'Otogar Yeni', lat: 38.4390, lon: 27.1800 },

  // Yenişehir / Tepecik
  { id: 10095, name: 'Tepecik Hastanesi', lat: 38.4150, lon: 27.1350 },
  { id: 10096, name: 'Yenişehir', lat: 38.4200, lon: 27.1500 },

  // Uzundere
  { id: 10100, name: 'Uzundere', lat: 38.3750, lon: 27.1350 },
  { id: 10101, name: 'TOKİ Evleri', lat: 38.3800, lon: 27.1320 },

  // Ballıkuyu / Yeşildere
  { id: 10105, name: 'Ballıkuyu', lat: 38.4060, lon: 27.0980 },
  { id: 10106, name: 'Yeşildere Cami', lat: 38.4050, lon: 27.1000 },

  // Güzelbahçe
  { id: 10110, name: 'Güzelbahçe', lat: 38.3720, lon: 27.0000 },
  { id: 10111, name: 'Güzelbahçe Meydan', lat: 38.3730, lon: 27.0020 },

  // Stadyum / Sanayi
  { id: 10115, name: 'Stadyum', lat: 38.4420, lon: 27.1800 },
  { id: 10116, name: 'Sanayi', lat: 38.4480, lon: 27.1900 },

  // Dokuz Eylül / Rektörlük
  { id: 10120, name: 'Dokuz Eylül Rektörlük', lat: 38.4180, lon: 27.1210 },
  { id: 10121, name: 'Sosyal Sigortalar', lat: 38.4190, lon: 27.1240 },

  // İzmir Hilal
  { id: 10125, name: 'İzmir Hilal', lat: 38.4300, lon: 27.1520 },

  // Poligon
  { id: 10130, name: 'Poligon', lat: 38.3985, lon: 27.0850 },

  // Postacılar / Altındağ
  { id: 10135, name: 'Postacılar', lat: 38.4350, lon: 27.1580 },
  { id: 10136, name: 'Altındağ', lat: 38.4360, lon: 27.1760 },

  // Yeşilyurt
  { id: 10140, name: 'Yeşilyurt', lat: 38.3900, lon: 27.1180 },
  { id: 10141, name: 'Yeşilyurt Cami', lat: 38.3910, lon: 27.1190 },

  // Konutkent / Evka
  { id: 10145, name: 'Evka 1', lat: 38.4780, lon: 27.2250 },
  { id: 10146, name: 'Evka 2', lat: 38.4700, lon: 27.2280 },
];

// ============================================================================
// ROUTE DEFINITIONS - Major ESHOT bus routes
// ============================================================================

interface RouteData {
  number: number;
  name: string;
  stopIds: number[]; // references to ESHOT_STOPS[].id
  frequency: number; // minutes between buses (peak)
  offPeakFrequency: number; // minutes between buses (off-peak)
  serviceStart: number; // minutes since midnight
  serviceEnd: number; // minutes since midnight
}

const ESHOT_ROUTES: RouteData[] = [
  // === AIRPORT ROUTES ===
  {
    number: 200,
    name: 'Havalimanı - Mavişehir',
    stopIds: [10083, 10084, 10082, 10081, 10080, 10086, 10020, 10027, 10022, 10021, 10042, 10063, 10064, 10065],
    frequency: 30,
    offPeakFrequency: 60,
    serviceStart: 4 * 60,  // 04:00
    serviceEnd: 24 * 60,   // 00:00
  },
  {
    number: 202,
    name: 'Cumhuriyet Meydanı - Havalimanı',
    stopIds: [10010, 10009, 10120, 10121, 10002, 10021, 10028, 10020, 10086, 10085, 10081, 10087, 10082, 10083],
    frequency: 30,
    offPeakFrequency: 60,
    serviceStart: 4 * 60,
    serviceEnd: 24 * 60 + 30, // 00:30 (24h service)
  },
  {
    number: 204,
    name: 'Bornova Merkez Metro - Havalimanı',
    stopIds: [10050, 10054, 10115, 10116, 10090, 10040, 10080, 10081, 10082, 10083],
    frequency: 30,
    offPeakFrequency: 60,
    serviceStart: 5 * 60,
    serviceEnd: 23 * 60,
  },

  // === OTOGAR (BUS TERMINAL) ROUTES ===
  {
    number: 54,
    name: 'Kemer - Otogar',
    stopIds: [10006, 10005, 10095, 10096, 10041, 10040, 10115, 10090],
    frequency: 15,
    offPeakFrequency: 25,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },
  {
    number: 302,
    name: 'Otogar - Konak',
    stopIds: [10091, 10090, 10136, 10041, 10096, 10095, 10012, 10006, 10005, 10004, 10003, 10002, 10001],
    frequency: 15,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },

  // === MAJOR URBAN CORRIDORS ===
  {
    number: 5,
    name: 'Narlıdere - Üçkuyular İskele',
    stopIds: [10026, 10025, 10024, 10023, 10022, 10020, 10021, 10027],
    frequency: 10,
    offPeakFrequency: 15,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },
  {
    number: 8,
    name: 'Güzelbahçe - F.Altay Aktarma Merkezi',
    stopIds: [10110, 10111, 10026, 10025, 10024, 10023, 10130, 10020],
    frequency: 12,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 23,
    name: 'Uzundere - Konak',
    stopIds: [10100, 10101, 10034, 10032, 10015, 10014, 10013, 10016, 10011, 10001],
    frequency: 10,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },
  {
    number: 35,
    name: 'Ballıkuyu - Konak',
    stopIds: [10105, 10106, 10015, 10014, 10013, 10006, 10005, 10004, 10003, 10002, 10001],
    frequency: 10,
    offPeakFrequency: 18,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },
  {
    number: 104,
    name: 'Tınaztepe - Konak',
    stopIds: [10033, 10034, 10032, 10031, 10030, 10011, 10012, 10006, 10001],
    frequency: 10,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 147,
    name: 'Postacılar - Halkapınar',
    stopIds: [10135, 10043, 10044, 10042, 10040],
    frequency: 12,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 505,
    name: 'Bornova Merkez Metro - Otogar',
    stopIds: [10050, 10054, 10051, 10115, 10116, 10090],
    frequency: 12,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },
  {
    number: 555,
    name: 'Otogar - Halkapınar',
    stopIds: [10090, 10115, 10040, 10125],
    frequency: 15,
    offPeakFrequency: 25,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },

  // === UNIVERSITY & HOSPITAL ROUTES ===
  {
    number: 118,
    name: 'ESHOT - Evka 4',
    stopIds: [10011, 10030, 10031, 10040, 10115, 10050, 10051, 10052, 10053],
    frequency: 12,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 285,
    name: 'Üçyol Metro - Dokuz Eylül Hastanesi',
    stopIds: [10030, 10130, 10023, 10024],
    frequency: 15,
    offPeakFrequency: 25,
    serviceStart: 6 * 60 + 30,
    serviceEnd: 22 * 60,
  },
  {
    number: 579,
    name: 'Yeşilyurt - Üçyol Metro',
    stopIds: [10140, 10141, 10032, 10031, 10030],
    frequency: 15,
    offPeakFrequency: 25,
    serviceStart: 6 * 60,
    serviceEnd: 22 * 60 + 30,
  },

  // === CROSS-CITY CONNECTORS ===
  {
    number: 620,
    name: 'Karşıyaka - Bornova',
    stopIds: [10060, 10061, 10062, 10042, 10044, 10050, 10051],
    frequency: 12,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 690,
    name: 'Tınaztepe - Fahrettin Altay',
    stopIds: [10033, 10034, 10032, 10031, 10030, 10130, 10020],
    frequency: 15,
    offPeakFrequency: 25,
    serviceStart: 6 * 60,
    serviceEnd: 22 * 60 + 30,
  },
  {
    number: 740,
    name: 'Konak - Çiğli',
    stopIds: [10001, 10007, 10042, 10063, 10064, 10065, 10070, 10071],
    frequency: 15,
    offPeakFrequency: 25,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 760,
    name: 'Bostanlı - Menemen',
    stopIds: [10063, 10064, 10065, 10070, 10072, 10075, 10076],
    frequency: 20,
    offPeakFrequency: 35,
    serviceStart: 6 * 60,
    serviceEnd: 22 * 60,
  },
  {
    number: 820,
    name: 'Karşıyaka - Mavişehir',
    stopIds: [10060, 10061, 10063, 10064, 10065],
    frequency: 10,
    offPeakFrequency: 15,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },
  {
    number: 827,
    name: 'Bostanlı İskele - Çiğli',
    stopIds: [10063, 10064, 10065, 10070, 10071, 10072],
    frequency: 15,
    offPeakFrequency: 25,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 916,
    name: 'Konak - Evka 3 Metro',
    stopIds: [10001, 10008, 10005, 10125, 10040, 10115, 10116, 10050, 10051, 10052],
    frequency: 12,
    offPeakFrequency: 20,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60,
  },
  {
    number: 935,
    name: 'Konak - Buca Tınaztepe',
    stopIds: [10001, 10011, 10030, 10031, 10032, 10034, 10033],
    frequency: 10,
    offPeakFrequency: 18,
    serviceStart: 6 * 60,
    serviceEnd: 23 * 60 + 30,
  },
];

// ============================================================================
// DATA GENERATION
// ============================================================================

/**
 * Format minutes since midnight as HH:MM:SS
 * Supports times > 24:00 for GTFS (trips crossing midnight)
 */
function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

/**
 * Generate trips and stop_times for a single route
 */
function generateTripsForRoute(
  routeData: RouteData,
): { trips: Trip[]; stopTimes: StopTime[] } {
  const trips: Trip[] = [];
  const stopTimes: StopTime[] = [];
  const routeId = `bus_${routeData.number}`;
  const numStops = routeData.stopIds.length;

  // Estimate trip duration based on number of stops (~2.5 min per stop)
  const tripDuration = Math.max(numStops * 2.5, 10);
  const timePerSegment = tripDuration / (numStops - 1);

  // Peak hours: 07:00-09:00 and 17:00-19:00
  const peakStart1 = 7 * 60;
  const peakEnd1 = 9 * 60;
  const peakStart2 = 17 * 60;
  const peakEnd2 = 19 * 60;

  let tripIndex = 0;

  // Direction 0: Forward
  let departureMinutes = routeData.serviceStart;
  while (departureMinutes <= routeData.serviceEnd) {
    const isPeak =
      (departureMinutes >= peakStart1 && departureMinutes < peakEnd1) ||
      (departureMinutes >= peakStart2 && departureMinutes < peakEnd2);
    const frequency = isPeak ? routeData.frequency : routeData.offPeakFrequency;

    const tripId = `${routeId}_d0_${tripIndex}`;
    trips.push({
      id: tripId,
      routeId,
      serviceId: 'ESHOT_DAILY',
      headsign: routeData.name.split(' - ').pop() || '',
      directionId: 0,
    });

    for (let seq = 0; seq < numStops; seq++) {
      const time = departureMinutes + seq * timePerSegment;
      const timeStr = formatTime(time);
      stopTimes.push({
        tripId,
        stopId: `bus_${routeData.stopIds[seq]}`,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: seq + 1,
      });
    }

    tripIndex++;
    departureMinutes += frequency;
  }

  // Direction 1: Reverse
  const reversedStopIds = [...routeData.stopIds].reverse();
  let tripIndex2 = 0;
  departureMinutes = routeData.serviceStart;

  while (departureMinutes <= routeData.serviceEnd) {
    const isPeak =
      (departureMinutes >= peakStart1 && departureMinutes < peakEnd1) ||
      (departureMinutes >= peakStart2 && departureMinutes < peakEnd2);
    const frequency = isPeak ? routeData.frequency : routeData.offPeakFrequency;

    const tripId = `${routeId}_d1_${tripIndex2}`;
    trips.push({
      id: tripId,
      routeId,
      serviceId: 'ESHOT_DAILY',
      headsign: routeData.name.split(' - ')[0] || '',
      directionId: 1,
    });

    for (let seq = 0; seq < numStops; seq++) {
      const time = departureMinutes + seq * timePerSegment;
      const timeStr = formatTime(time);
      stopTimes.push({
        tripId,
        stopId: `bus_${reversedStopIds[seq]}`,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: seq + 1,
      });
    }

    tripIndex2++;
    departureMinutes += frequency;
  }

  return { trips, stopTimes };
}

/**
 * Generate complete ESHOT bus fallback data
 * Returns stops, routes, trips, and stop_times for ~25 major bus lines
 */
export function generateEshotFallbackData(): {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
} {
  // Collect all stop IDs actually used by routes
  const usedStopIds = new Set<number>();
  for (const route of ESHOT_ROUTES) {
    for (const stopId of route.stopIds) {
      usedStopIds.add(stopId);
    }
  }

  // Generate stops (only those referenced by routes)
  const stops: Stop[] = ESHOT_STOPS
    .filter(s => usedStopIds.has(s.id))
    .map(s => ({
      id: `bus_${s.id}`,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      locationType: 0,
    }));

  // Generate routes
  const routes: Route[] = ESHOT_ROUTES.map(r => ({
    id: `bus_${r.number}`,
    shortName: String(r.number),
    longName: r.name,
    type: 3, // bus
    color: ESHOT_BUS_COLOR,
    textColor: ESHOT_TEXT_COLOR,
  }));

  // Generate trips and stop_times
  const allTrips: Trip[] = [];
  const allStopTimes: StopTime[] = [];

  for (const routeData of ESHOT_ROUTES) {
    const { trips, stopTimes } = generateTripsForRoute(routeData);
    allTrips.push(...trips);
    allStopTimes.push(...stopTimes);
  }

  return {
    stops,
    routes,
    trips: allTrips,
    stopTimes: allStopTimes,
  };
}
