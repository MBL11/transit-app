import { Stop, Route, Trip } from './models';

export interface RouteSegment {
  type: 'walk' | 'transit';
  from: Stop;
  to: Stop;
  route?: Route;
  trip?: Trip;
  departureTime?: Date;
  arrivalTime?: Date;
  duration: number; // minutes
  distance?: number; // mètres (pour walk)
}

export interface JourneyResult {
  segments: RouteSegment[];
  totalDuration: number; // minutes
  totalWalkDistance: number; // mètres
  numberOfTransfers: number;
  departureTime: Date;
  arrivalTime: Date;
  tags?: string[]; // Optional tags like 'fastest', 'least-transfers', 'eco-friendly'
}
