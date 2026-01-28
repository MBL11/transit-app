/**
 * Izmir Transit Configuration
 * ESHOT, Metro Izmir, IZBAN - Izmir public transport
 */

import type { AdapterConfig, DataSource } from '../../core/types/adapter';

/**
 * Izmir region configuration
 */
export const izmirConfig: AdapterConfig = {
  cityName: 'İzmir',
  defaultLocale: 'tr',
  supportedLocales: ['tr', 'en'],
  timezone: 'Europe/Istanbul',
  // Bounding box for Izmir metropolitan area
  boundingBox: [38.2, 26.6, 38.7, 27.4], // [minLat, minLon, maxLat, maxLon]
  defaultZoom: 12,
  defaultCenter: [38.4237, 27.1428], // Izmir center (Konak)
  currency: 'TRY',
  distanceUnit: 'metric',
};

/**
 * Izmir data sources
 */
export const izmirDataSources: DataSource[] = [
  {
    name: 'ESHOT',
    url: 'https://www.eshot.gov.tr',
    license: 'Public Domain',
    attribution: '© ESHOT - İzmir Büyükşehir Belediyesi',
  },
  {
    name: 'Metro İzmir',
    url: 'https://www.izmirmetro.com.tr',
    license: 'Public Domain',
    attribution: '© İzmir Metro A.Ş.',
  },
  {
    name: 'İZBAN',
    url: 'https://www.izban.com.tr',
    license: 'Public Domain',
    attribution: '© İZBAN A.Ş.',
  },
];

/**
 * GTFS feed URLs for Izmir
 */
export const izmirGTFSUrls = {
  // ESHOT Bus
  eshot: 'https://www.eshot.gov.tr/gtfs/bus-eshot-gtfs.zip',
  // Metro Izmir
  metro: 'https://www.izmirmetro.com.tr/gtfs/rail-metro-gtfs.zip',
  // IZBAN commuter rail
  izban: 'https://www.izban.com.tr/gtfs/rail-izban-gtfs.zip',
};

/**
 * Izmir transport types mapping
 * GTFS route_type -> Display name (Turkish)
 */
export const izmirTransportTypes = {
  0: 'Tramvay',
  1: 'Metro',
  2: 'Banliyö Treni', // IZBAN
  3: 'Otobüs',
  4: 'Feribot',
  5: 'Teleferik',
  6: 'Füniküler',
  7: 'Füniküler',
} as const;

/**
 * Izmir line colors (official colors from operators)
 */
export const izmirLineColors = {
  // Metro lines
  'M1': '#E30613', // Red - Üçyol-Bornova
  'M2': '#00A651', // Green - planned

  // IZBAN
  'S1': '#1E3A8A', // Blue - Aliağa-Menderes

  // Tram
  'T1': '#F7941D', // Orange - Konak tram

  // Default bus color
  'bus': '#4A90D9',
};
