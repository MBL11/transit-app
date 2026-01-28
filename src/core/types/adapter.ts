/**
 * Transit Adapter Interface
 * This interface defines the contract that any city adapter must implement
 * to make the app work with different transit systems
 */

import type { Stop, Route, Trip, StopTime } from './models';

/**
 * Configuration for a specific city/region
 */
export interface AdapterConfig {
  cityName: string;
  defaultLocale: string;
  supportedLocales: string[];
  timezone: string;
  boundingBox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  defaultZoom: number;
  defaultCenter: [number, number]; // [lat, lon]
  currency: string;
  distanceUnit: 'metric' | 'imperial';
}

/**
 * Real-time departure information
 */
export interface NextDeparture {
  tripId: string;
  routeId: string;
  routeShortName: string;
  routeColor?: string; // Hex color (optional)
  routeType?: number; // GTFS route type (0=tram, 1=metro, 2=rail, 3=bus, 4=ferry)
  headsign: string;
  departureTime: Date;
  scheduledTime?: Date;
  isRealtime: boolean;
  delay: number; // seconds
}

/**
 * Service alert/disruption
 */
export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'severe';
  affectedRoutes?: string[];
  affectedStops?: string[];
  startTime: Date;
  endTime?: Date;
  url?: string;
}

/**
 * Information about the data source
 */
export interface DataSource {
  name: string;
  url: string;
  license: string;
  attribution: string;
}

/**
 * Main adapter interface that each city must implement
 */
export interface TransitAdapter {
  readonly config: AdapterConfig;

  // Load GTFS static data
  loadStops(): Promise<Stop[]>;
  loadRoutes(): Promise<Route[]>;
  loadTrips(): Promise<Trip[]>;
  loadStopTimes(): Promise<StopTime[]>;
  loadShapes?(): Promise<any[]>;

  // Real-time data (optional for now)
  getNextDepartures(stopId: string): Promise<NextDeparture[]>;
  getAlerts(): Promise<Alert[]>;

  // Metadata
  getDataSource(): DataSource;
  getLastUpdate(): Date;
}
