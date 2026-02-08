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
 */
export const izmirMetroLines = {
  M1: {
    name: 'Fahrettin Altay - Evka 3',
    color: '#D61C1F', // Red (kırmızı)
    stations: 21,
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
    stations: 42,
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
