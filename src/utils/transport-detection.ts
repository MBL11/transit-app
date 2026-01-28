/**
 * Transport type detection for İzmir GTFS data
 *
 * İzmir GTFS sources ALL use route_type=0 regardless of actual transport type.
 * This module provides name-based detection as a fallback when route_type
 * hasn't been overridden during import.
 */

export type TransitType = 'metro' | 'bus' | 'tram' | 'izban' | 'ferry';

// Known İzmir metro line terminus/key station names
// These appear in route longNames like "Fahrettin Altay - Halkapınar"
const METRO_KEYWORDS = [
  'FAHRETTIN ALTAY', 'FAHRETTİN ALTAY',
  'EVKA 3', 'EVKA3', 'EVKA-3',
  'ÜÇYOL', 'UCYOL', 'ÜCYOL',
  'HALKAPINAR', 'HALKAPINAR',
];

// Known İZBAN indicators
const IZBAN_KEYWORDS = [
  'İZBAN', 'IZBAN',
  'ALİAĞA', 'ALIAGA', 'ALIAĞA',
  'CUMAOVASI', 'CUMAOVAS',
  'SELÇUK', 'SELCUK',
  'TORBALÍ', 'TORBALI',
];

// Known ferry indicators
const FERRY_KEYWORDS = [
  'VAPUR', 'FERİBOT', 'FERIBOT', 'FERRY',
  'İZDENİZ', 'IZDENIZ',
  'İSKELE', 'ISKELE',
];

/**
 * Detect transit type from route data.
 * Works even when all routes have route_type=0 (İzmir GTFS quirk).
 *
 * Detection order:
 * 1. Trust specific route_types (1=metro, 2=izban, 4=ferry) from import overrides
 * 2. Check shortName prefix patterns (M1, T1, S1, F1)
 * 3. Check explicit keywords in name (METRO, İZBAN, TRAM, VAPUR)
 * 4. Check İzmir-specific station names in longName
 * 5. Default to bus
 */
export function detectTransitType(
  gtfsType: number,
  shortName?: string,
  longName?: string,
): TransitType {
  const combinedName = ((shortName || '') + ' ' + (longName || '')).toUpperCase();
  const shortUpper = (shortName || '').toUpperCase().trim();

  // 1. Trust specific route_types (reliable when data was imported with overrides)
  if (gtfsType === 1) return 'metro';
  if (gtfsType === 2) return 'izban';
  if (gtfsType === 4) return 'ferry';
  // NOTE: Do NOT use gtfsType === 0 or gtfsType === 3 as broad matchers
  // İzmir GTFS uses route_type=0 for ALL transport types

  // 2. Check shortName prefix patterns (M1, T1, S1, F1)
  if (/^M\d/i.test(shortUpper)) return 'metro';
  if (/^S\d/i.test(shortUpper)) return 'izban';
  if (/^T\d/i.test(shortUpper)) return 'tram';
  if (/^F\d/i.test(shortUpper)) return 'ferry';

  // 3. Check explicit keywords in name
  if (combinedName.includes('METRO')) return 'metro';
  if (combinedName.includes('İZBAN') || combinedName.includes('IZBAN')) return 'izban';
  if (combinedName.includes('TRAM') || combinedName.includes('TRAMVAY')) return 'tram';
  if (FERRY_KEYWORDS.some(kw => combinedName.includes(kw))) return 'ferry';

  // 4. Check İzmir-specific station/line names in the combined name
  if (METRO_KEYWORDS.some(kw => combinedName.includes(kw))) return 'metro';
  if (IZBAN_KEYWORDS.some(kw => combinedName.includes(kw))) return 'izban';

  // 5. Default to bus (most common type)
  return 'bus';
}

/**
 * Convert TransitType string to GTFS numeric route_type
 */
export function transitTypeToRouteType(type: TransitType): number {
  switch (type) {
    case 'metro': return 1;
    case 'tram': return 0;
    case 'izban': return 2;
    case 'ferry': return 4;
    case 'bus': return 3;
  }
}
