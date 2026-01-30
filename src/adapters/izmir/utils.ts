/**
 * İzmir Transit Utilities
 * Helper functions for İzmir transit data
 */

import { izmirTransportTypes, izmirTransportColors } from './config';

/**
 * Get transport type name in Turkish
 */
export function getTransportTypeName(routeType: number): string {
  return izmirTransportTypes[routeType as keyof typeof izmirTransportTypes] || 'Bilinmeyen';
}

/**
 * Get transport type color
 */
export function getTransportTypeColor(routeType: number): string {
  return izmirTransportColors[routeType] || '#666666';
}

/**
 * Format İzmir-specific stop ID
 * ESHOT uses numeric IDs, Metro/Tramway use prefixed IDs
 */
export function formatStopId(stopId: string, source: 'eshot' | 'metro' | 'tramway' | 'izban'): string {
  const prefixes = {
    eshot: 'ESHOT_',
    metro: 'METRO_',
    tramway: 'TRAM_',
    izban: 'IZBAN_',
  };
  return `${prefixes[source]}${stopId}`;
}

/**
 * Parse İzmir stop ID to get source and original ID
 */
export function parseStopId(stopId: string): { source: string; originalId: string } {
  const match = stopId.match(/^(ESHOT|METRO|TRAM|IZBAN)_(.+)$/);
  if (match) {
    return { source: match[1].toLowerCase(), originalId: match[2] };
  }
  return { source: 'unknown', originalId: stopId };
}

/**
 * Check if coordinates are within İzmir bounding box
 */
export function isInIzmirBounds(lat: number, lon: number): boolean {
  // İzmir bbox: approximately lat 38.2-38.7, lon 26.7-27.5
  return lat >= 38.0 && lat <= 39.0 && lon >= 26.5 && lon <= 28.0;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format time for display (Turkish format)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration in minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} dk`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} sa`;
}

/**
 * Get line color for İzmir transit
 * Uses official colors when available
 */
export function getLineColor(routeShortName: string, routeType: number): string {
  const name = (routeShortName || '').toUpperCase();

  // Metro lines - Red (#D61C1F)
  if (name.startsWith('M') || routeType === 1) return '#D61C1F';

  // İZBAN - Dark Blue (#005BBB)
  if (name.includes('İZBAN') || name.includes('IZBAN') || name.includes('S1') || name.includes('S2')) {
    return '#005BBB';
  }

  // Rail type 2 = İZBAN
  if (routeType === 2) return '#005BBB';

  // Tramway - Green (#00A651)
  if (name.startsWith('T') || routeType === 0) {
    return '#00A651';
  }

  // Ferry (Vapur) - Turquoise (#0099CC)
  if (routeType === 4) return '#0099CC';

  // Bus - ESHOT Blue
  if (routeType === 3) return '#0066CC';

  // Default
  return getTransportTypeColor(routeType);
}

/**
 * Normalize Turkish characters for search
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c');
}

/**
 * Search stops by name (case-insensitive, handles Turkish characters)
 */
export function matchesSearch(name: string, query: string): boolean {
  const normalizedName = normalizeForSearch(name);
  const normalizedQuery = normalizeForSearch(query);
  return normalizedName.includes(normalizedQuery);
}
