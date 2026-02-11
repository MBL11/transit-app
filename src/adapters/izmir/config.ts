/**
 * İzmir Transit Configuration
 * ESHOT (İzmir Metropolitan Municipality Transportation)
 * İzBAN (Commuter Rail)
 * Metro İzmir
 */

import type { AdapterConfig, DataSource } from '../../core/types/adapter';

/**
 * İzmir region configuration
 */
export const izmirConfig: AdapterConfig = {
  cityName: 'İzmir',
  defaultLocale: 'tr',
  supportedLocales: ['tr', 'en'],
  timezone: 'Europe/Istanbul',
  // Bounding box for İzmir metropolitan area
  // Covers from Aliağa (north) to Selçuk (south), Ödemiş (east) to coast (west)
  boundingBox: [38.2, 26.7, 38.7, 27.5], // [minLat, minLon, maxLat, maxLon]
  defaultZoom: 12,
  defaultCenter: [38.4192, 27.1287], // İzmir center (Konak)
  currency: 'TRY',
  distanceUnit: 'metric',
};

/**
 * ESHOT Data source information
 */
export const izmirDataSource: DataSource = {
  name: 'ESHOT - İzmir Büyükşehir Belediyesi',
  url: 'https://www.eshot.gov.tr',
  license: 'Open Data',
  attribution: '© ESHOT - İzmir Büyükşehir Belediyesi Ulaşım Koordinasyon Merkezi',
};

/**
 * GTFS feed URLs for İzmir
 * Multiple sources: ESHOT (bus), Metro İzmir, Tramway, İzBAN
 */
export const izmirGTFSUrls = {
  // ESHOT Open Data page
  openDataPage: 'https://www.eshot.gov.tr/tr/UlasimVerisi/288',

  // Metro İzmir GTFS
  metro: 'https://www.izmirmetro.com.tr/gtfs/rail-metro-gtfs.zip',

  // Tramway İzmir GTFS
  tramway: 'https://www.tramizmir.com/gtfs/rail-tramizmir-gtfs.zip',

  // İzBAN commuter rail (if available)
  izban: 'https://www.izban.com.tr/gtfs/rail-izban-gtfs.zip',

  // ESHOT bus (main GTFS - large file)
  // NOTE: As of 2024, this URL returns 403 Forbidden - bus data unavailable
  bus: 'https://www.eshot.gov.tr/gtfs/eshot-gtfs.zip',
};

/**
 * İzmir transport types mapping
 * GTFS route_type -> Display name (Turkish)
 */
export const izmirTransportTypes = {
  0: 'Tramvay',
  1: 'Metro',
  2: 'İzBAN', // Commuter rail
  3: 'Otobüs',
  4: 'Vapur/Feribot', // Ferry
  5: 'Teleferik', // Aerial lift
  6: 'Füniküler', // Funicular
  7: 'Füniküler',
  11: 'Troleybüs', // Trolleybus
  12: 'Monoray', // Monorail
} as const;

/**
 * İzmir transport type colors (from official İzmir rapid transit map)
 * Metro: Red (#D61C1F), İZBAN: Dark Blue (#005BBB), Tram: Green (#00A651)
 * Bus: ESHOT Blue (#0066CC), Ferry: Turquoise (#0099CC)
 */
export const izmirTransportColors: Record<number, string> = {
  0: '#00A651', // Tramway - Green (yeşil)
  1: '#D61C1F', // Metro - Red (kırmızı)
  2: '#005BBB', // İZBAN - Dark Blue (mavi)
  3: '#0066CC', // Bus - ESHOT Blue
  4: '#0099CC', // Ferry (Vapur) - Turquoise
};

/**
 * İzmir Metro lines
 * M1: Extended to Narlıdere in February 2024 (Kaymakamlık → Evka 3)
 */
export const izmirMetroLines = {
  M1: {
    name: 'Kaymakamlık - Evka 3',
    color: '#D61C1F', // Red (kırmızı)
    stations: 24, // After Narlıdere extension (Feb 2024)
  },
  M2: {
    name: 'Bornova - Fahrettin Altay',
    color: '#D61C1F', // Red (under construction)
    stations: 11,
  },
};

/**
 * İZBAN lines (Blue - official)
 */
export const izbanLines = {
  IZBAN: {
    name: 'Aliağa - Selçuk/Torbalı',
    color: '#005BBB', // Dark Blue (mavi)
    stations: 41, // As of 2024
  },
};

/**
 * Tramway lines - each line has a distinct color
 * T1 Karşıyaka: Green (Alaybey → Flamingo), T2 Konak: Orange (Fahrettin Altay → Halkapınar)
 */
export const izmirTramwayLines = {
  T1: {
    name: 'Karşıyaka Tramvayı',
    color: '#00A651', // Green (yeşil)
    stations: 14, // Alaybey → Flamingo
  },
  T2: {
    name: 'Konak Tramvayı',
    color: '#F7941D', // Orange (turuncu)
    stations: 19, // Fahrettin Altay → Halkapınar
  },
  T3: {
    name: 'Çiğli Tramvayı',
    color: '#9B59B6', // Purple (mor)
    stations: 14,
  },
};

/**
 * Operating hours for İzmir transit modes
 * Format: [firstDepartureHour, firstDepartureMinute, lastDepartureHour, lastDepartureMinute]
 * Hours are in 24h format. Last departure is from TERMINUS.
 */
export const izmirOperatingHours: Record<number, { start: number; end: number; name: string }> = {
  0: { start: 5 * 60, end: 24 * 60, name: 'Tramway' },        // 05:00 - 00:00
  1: { start: 6 * 60, end: 24 * 60 + 20, name: 'Metro' },     // 06:00 - 00:20
  2: { start: 5 * 60 + 10, end: 24 * 60 + 50, name: 'İZBAN' }, // 05:10 - 00:50
  3: { start: 6 * 60, end: 23 * 60 + 30, name: 'Bus' },       // 06:00 - 23:30
  4: { start: 7 * 60, end: 23 * 60, name: 'Ferry' },          // 07:00 - 23:00
};

/**
 * Night bus lines (Baykuş - "Owl" lines)
 * These operate from ~23:00 to ~05:00
 */
export const IZMIR_NIGHT_BUS_LINES = ['910', '920', '930', '940', '950'];

/**
 * Check if a transport mode is operating at the given time
 * @param routeType GTFS route_type (0=Tram, 1=Metro, 2=İZBAN, 3=Bus, 4=Ferry)
 * @param timeMinutes Time in minutes since midnight (e.g., 90 = 01:30)
 * @param routeShortName Optional route name to check for night buses
 * @returns true if the mode is operating, false otherwise
 */
export function isTransitOperating(
  routeType: number,
  timeMinutes: number,
  routeShortName?: string
): boolean {
  // Night buses operate 23:00-05:00
  if (routeType === 3 && routeShortName && IZMIR_NIGHT_BUS_LINES.includes(routeShortName)) {
    return timeMinutes >= 23 * 60 || timeMinutes < 5 * 60;
  }

  const hours = izmirOperatingHours[routeType];
  if (!hours) {
    return true; // Unknown route type, allow by default
  }

  // Handle times after midnight (e.g., 00:30 = 30 minutes, but end might be 24*60+50 = 1490)
  // Normalize: if time < 5:00 (300 min) and end > 24:00, add 24 hours to time
  let normalizedTime = timeMinutes;
  if (timeMinutes < 5 * 60 && hours.end > 24 * 60) {
    normalizedTime = timeMinutes + 24 * 60;
  }

  return normalizedTime >= hours.start && normalizedTime <= hours.end;
}

/**
 * Get the next operating window for a transport mode
 * @returns { opensAt: number, closesAt: number } in minutes since midnight
 */
export function getOperatingWindow(routeType: number): { opensAt: number; closesAt: number } | null {
  const hours = izmirOperatingHours[routeType];
  if (!hours) return null;
  return {
    opensAt: hours.start,
    closesAt: hours.end > 24 * 60 ? hours.end - 24 * 60 : hours.end
  };
}

/**
 * Average frequency (in minutes) for each transport mode
 * Used to estimate wait times
 */
export const izmirFrequencies: Record<number, number> = {
  0: 6,   // Tramway: every 6 min
  1: 4,   // Metro: every 4 min
  2: 12,  // İZBAN: every 12 min
  3: 15,  // Bus: average every 15 min
  4: 25,  // Ferry: every 25 min
};

/**
 * Transfer times between modes at the same hub (in minutes)
 * Format: [fromType][toType] = minutes
 */
export const izmirTransferTimes: Record<string, number> = {
  // Metro transfers
  '1-1': 2,   // Metro → Metro (same platform)
  '1-2': 5,   // Metro → İZBAN (different platform)
  '1-0': 6,   // Metro → Tram (exit station)
  '1-4': 10,  // Metro → Ferry (walk to port)
  '1-3': 4,   // Metro → Bus (exit station)

  // İZBAN transfers
  '2-1': 5,   // İZBAN → Metro
  '2-2': 2,   // İZBAN → İZBAN (same platform)
  '2-0': 5,   // İZBAN → Tram
  '2-4': 8,   // İZBAN → Ferry
  '2-3': 4,   // İZBAN → Bus

  // Tram transfers
  '0-1': 6,   // Tram → Metro
  '0-2': 5,   // Tram → İZBAN
  '0-0': 2,   // Tram → Tram
  '0-4': 5,   // Tram → Ferry
  '0-3': 3,   // Tram → Bus

  // Ferry transfers
  '4-1': 10,  // Ferry → Metro
  '4-2': 8,   // Ferry → İZBAN
  '4-0': 5,   // Ferry → Tram
  '4-4': 5,   // Ferry → Ferry
  '4-3': 5,   // Ferry → Bus

  // Bus transfers
  '3-1': 4,   // Bus → Metro
  '3-2': 4,   // Bus → İZBAN
  '3-0': 3,   // Bus → Tram
  '3-4': 5,   // Bus → Ferry
  '3-3': 3,   // Bus → Bus
};

/**
 * Get transfer time between two modes at the same hub
 */
export function getTransferTime(fromRouteType: number, toRouteType: number): number {
  const key = `${fromRouteType}-${toRouteType}`;
  return izmirTransferTimes[key] ?? 5; // Default 5 min if unknown
}

/**
 * Multimodal hubs in İzmir
 * Key locations where multiple transit modes connect
 */
export const izmirMultimodalHubs: Record<string, { modes: number[]; transferTime: number }> = {
  'halkapınar': { modes: [1, 2, 0, 3], transferTime: 5 },      // Metro + İZBAN + Tram + Bus (MAIN HUB)
  'hilal': { modes: [1, 2], transferTime: 4 },                  // Metro + İZBAN
  'konak': { modes: [1, 0, 4], transferTime: 6 },               // Metro + Tram + Ferry (nearby)
  'alsancak': { modes: [2, 0, 4], transferTime: 5 },            // İZBAN + Tram + Ferry (nearby)
  'çiğli': { modes: [2, 0], transferTime: 4 },                  // İZBAN + Tram
  'alaybey': { modes: [2, 0], transferTime: 4 },                // İZBAN + Tram
  'mavişehir': { modes: [2, 0], transferTime: 4 },              // İZBAN + Tram
  'karşıyaka iskele': { modes: [0, 4], transferTime: 3 },       // Tram + Ferry
  'bostanlı iskele': { modes: [0, 4], transferTime: 3 },        // Tram + Ferry
  'fahrettin altay': { modes: [1, 0], transferTime: 4 },        // Metro + Tram (T2 terminus)
  'üçyol': { modes: [1, 3], transferTime: 3 },                  // Metro + Bus hub
  'bornova': { modes: [1, 3], transferTime: 3 },                // Metro + Bus hub
};

/**
 * Check if a stop name matches a known multimodal hub
 */
export function isMultimodalHub(stopName: string): boolean {
  const normalized = stopName.toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+(metro|iskele|istasyonu|tram|vapur|feribot)$/g, '')
    .trim();

  return Object.keys(izmirMultimodalHubs).some(hub => normalized.includes(hub));
}
