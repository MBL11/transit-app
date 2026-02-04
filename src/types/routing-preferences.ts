/**
 * Routing preferences types
 * User preferences for route calculation
 */

export interface RoutingPreferences {
  // Allowed transport modes (İzmir)
  allowedModes: {
    metro: boolean;    // M1, M2
    izban: boolean;    // İZBAN commuter rail
    tram: boolean;     // T1, T2
    bus: boolean;      // ESHOT buses
    ferry: boolean;    // İzdeniz ferries (vapur)
    walking: boolean;
  };

  // Optimization criteria
  optimizeFor: 'fastest' | 'least-transfers' | 'least-walking' | 'most-accessible';

  // Limits
  maxTransfers: number; // 0-5, -1 = unlimited
  maxWalkingDistance: number; // in meters (500-2000)
  maxWaitingTime: number; // in minutes

  // Accessibility options
  wheelchair: boolean;
  avoidStairs: boolean;
}

export const DEFAULT_PREFERENCES: RoutingPreferences = {
  allowedModes: {
    metro: true,
    izban: true,
    tram: true,
    bus: true,
    ferry: true,
    walking: true,
  },
  optimizeFor: 'fastest',
  maxTransfers: -1, // unlimited
  maxWalkingDistance: 1000, // 1km
  maxWaitingTime: 15, // 15 minutes
  wheelchair: false,
  avoidStairs: false,
};

/**
 * Get display name for optimization mode
 */
export function getOptimizationLabel(mode: RoutingPreferences['optimizeFor']): string {
  switch (mode) {
    case 'fastest':
      return '⚡ Le plus rapide';
    case 'least-transfers':
      return '🔄 Moins de changements';
    case 'least-walking':
      return '🚶 Moins de marche';
    case 'most-accessible':
      return '♿ Plus accessible';
    default:
      return mode;
  }
}

/**
 * Check if a route type is allowed based on preferences
 */
export function isRouteTypeAllowed(
  routeType: number,
  preferences: RoutingPreferences
): boolean {
  // GTFS route types (İzmir):
  // 0 = Tram (T1, T2)
  // 1 = Metro (M1, M2)
  // 2 = Rail/İZBAN
  // 3 = Bus (ESHOT)
  // 4 = Ferry (İzdeniz/Vapur)
  switch (routeType) {
    case 0:
      return preferences.allowedModes.tram;
    case 1:
      return preferences.allowedModes.metro;
    case 2:
      return preferences.allowedModes.izban;
    case 3:
      return preferences.allowedModes.bus;
    case 4:
      return preferences.allowedModes.ferry;
    default:
      return true;
  }
}

/**
 * Check if journey meets preferences constraints
 */
export function meetsPreferences(
  journey: {
    totalDuration: number;
    numberOfTransfers: number;
    totalWalkDistance: number;
  },
  preferences: RoutingPreferences
): boolean {
  // Check max transfers
  if (
    preferences.maxTransfers !== -1 &&
    journey.numberOfTransfers > preferences.maxTransfers
  ) {
    return false;
  }

  // Check max walking distance
  if (journey.totalWalkDistance > preferences.maxWalkingDistance) {
    return false;
  }

  return true;
}

/**
 * Score a journey based on preferences
 * Higher score = better match
 */
export function scoreJourney(
  journey: {
    totalDuration: number;
    numberOfTransfers: number;
    totalWalkDistance: number;
  },
  preferences: RoutingPreferences
): number {
  let score = 0;

  switch (preferences.optimizeFor) {
    case 'fastest':
      // Prefer shorter duration (inverse scoring)
      score = 1000 - journey.totalDuration;
      break;
    case 'least-transfers':
      // Prefer fewer transfers
      score = 100 - journey.numberOfTransfers * 10;
      // Bonus for direct routes
      if (journey.numberOfTransfers === 0) {
        score += 50;
      }
      break;
    case 'least-walking':
      // Prefer less walking (inverse scoring)
      score = 2000 - journey.totalWalkDistance;
      break;
    case 'most-accessible':
      // Similar to least-walking but with different weights
      score = 2000 - journey.totalWalkDistance - journey.numberOfTransfers * 100;
      break;
  }

  return score;
}

/**
 * Get tags for a journey based on its characteristics
 */
export function getJourneyTags(
  journey: {
    totalDuration: number;
    numberOfTransfers: number;
    totalWalkDistance: number;
  },
  allJourneys: Array<{
    totalDuration: number;
    numberOfTransfers: number;
    totalWalkDistance: number;
  }>
): string[] {
  const tags: string[] = [];

  if (allJourneys.length === 0) return tags;

  // Find min values
  const minDuration = Math.min(...allJourneys.map((j) => j.totalDuration));
  const minTransfers = Math.min(...allJourneys.map((j) => j.numberOfTransfers));
  const minWalking = Math.min(...allJourneys.map((j) => j.totalWalkDistance));

  // Tag if this journey has the best value
  if (journey.totalDuration === minDuration) {
    tags.push('fastest');
  }
  if (journey.numberOfTransfers === minTransfers) {
    tags.push('least-transfers');
  }
  if (journey.totalWalkDistance === minWalking) {
    tags.push('least-walking');
  }

  // Eco-friendly tag for low-emission journeys (prefer metro/tram over bus)
  if (journey.totalWalkDistance < 500 && journey.numberOfTransfers <= 1) {
    tags.push('eco-friendly');
  }

  return tags;
}
