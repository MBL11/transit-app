/**
 * Serialization helpers for JourneyResult
 * React Navigation cannot serialize Date objects, so we convert them to ISO strings
 */

import type { JourneyResult, RouteSegment } from './routing';
import type { Stop, Route, Trip } from './models';

// Re-export JourneyResult for convenience
export type { JourneyResult } from './routing';

// Serializable version with ISO date strings instead of Date objects
export interface SerializableRouteSegment {
  type: 'walk' | 'transit';
  from: Stop;
  to: Stop;
  route?: Route;
  trip?: Trip;
  departureTime?: string; // ISO string
  arrivalTime?: string; // ISO string
  duration: number;
  distance?: number;
}

export interface SerializableJourneyResult {
  segments: SerializableRouteSegment[];
  totalDuration: number;
  totalWalkDistance: number;
  numberOfTransfers: number;
  departureTime: string; // ISO string
  arrivalTime: string; // ISO string
}

/**
 * Convert JourneyResult to serializable format
 */
export function serializeJourney(journey: JourneyResult): SerializableJourneyResult {
  return {
    segments: journey.segments.map(segment => ({
      ...segment,
      departureTime: segment.departureTime?.toISOString(),
      arrivalTime: segment.arrivalTime?.toISOString(),
    })),
    totalDuration: journey.totalDuration,
    totalWalkDistance: journey.totalWalkDistance,
    numberOfTransfers: journey.numberOfTransfers,
    departureTime: journey.departureTime.toISOString(),
    arrivalTime: journey.arrivalTime.toISOString(),
  };
}

/**
 * Convert serializable format back to JourneyResult
 */
export function deserializeJourney(serialized: SerializableJourneyResult): JourneyResult {
  return {
    segments: serialized.segments.map(segment => ({
      ...segment,
      departureTime: segment.departureTime ? new Date(segment.departureTime) : undefined,
      arrivalTime: segment.arrivalTime ? new Date(segment.arrivalTime) : undefined,
    })),
    totalDuration: serialized.totalDuration,
    totalWalkDistance: serialized.totalWalkDistance,
    numberOfTransfers: serialized.numberOfTransfers,
    departureTime: new Date(serialized.departureTime),
    arrivalTime: new Date(serialized.arrivalTime),
  };
}
