/**
 * Paris Transit Configuration
 * IDFM (Île-de-France Mobilités) - Paris region public transport
 */

import type { AdapterConfig, DataSource } from '../../core/types/adapter';

/**
 * Paris region configuration
 */
export const parisConfig: AdapterConfig = {
  cityName: 'Paris',
  defaultLocale: 'fr',
  supportedLocales: ['fr', 'en'],
  timezone: 'Europe/Paris',
  // Bounding box for Île-de-France region
  boundingBox: [48.4, 1.9, 49.2, 3.0], // [minLat, minLon, maxLat, maxLon]
  defaultZoom: 11,
  defaultCenter: [48.8566, 2.3522], // Paris center
  currency: 'EUR',
  distanceUnit: 'metric',
};

/**
 * IDFM Open Data source information
 */
export const parisDataSource: DataSource = {
  name: 'Île-de-France Mobilités (IDFM)',
  url: 'https://prim.iledefrance-mobilites.fr',
  license: 'ODbL (Open Database License)',
  attribution:
    '© Île-de-France Mobilités - Open Data - https://prim.iledefrance-mobilites.fr',
};

/**
 * GTFS feed URLs for Paris/IDFM
 * Note: These URLs may need to be updated periodically
 */
export const parisGTFSUrls = {
  // Static GTFS feed
  static: 'https://data.iledefrance-mobilites.fr/explore/dataset/offre-horaires-tc-gtfs-idfm/files/IDFM-gtfs.zip',

  // Real-time SIRI-Lite API (for step 10)
  realtimeBase: 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring',
};

/**
 * Paris transport types mapping
 * GTFS route_type -> Display name
 */
export const parisTransportTypes = {
  0: 'Tramway',
  1: 'Métro',
  2: 'RER/Train',
  3: 'Bus',
  4: 'Ferry',
  5: 'Téléphérique',
  6: 'Funiculaire',
  7: 'Funiculaire',
} as const;
