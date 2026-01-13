/**
 * Normalized database models for storing GTFS data in SQLite
 * These types represent the structure used in the local database
 */

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  locationType: number;
  parentStation?: string;
}

export interface Route {
  id: string;
  shortName: string;
  longName: string;
  type: number; // 0=tram, 1=metro, 2=rail, 3=bus
  color: string; // hex format #RRGGBB
  textColor: string;
}

export interface Trip {
  id: string;
  routeId: string;
  serviceId: string;
  headsign?: string;
  directionId: number;
  shapeId?: string;
}

export interface StopTime {
  tripId: string;
  arrivalTime: string; // format "HH:MM:SS"
  departureTime: string;
  stopId: string;
  stopSequence: number;
}
