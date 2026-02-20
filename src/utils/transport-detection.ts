/**
 * Transport type detection for İzmir GTFS data
 *
 * İzmir GTFS sources ALL use route_type=0 regardless of actual transport type.
 * This module provides name-based detection as a fallback when route_type
 * hasn't been overridden during import.
 *
 * After re-import, route_type is overridden per source:
 *   metro=1, tram=0, izban=2, ferry=4, bus=3
 */

export type TransitType = 'metro' | 'bus' | 'tram' | 'izban' | 'ferry';

// Metro-UNIQUE terminus names (NOT shared with tram)
// Metro line 1: Evka-3 ↔ Narlıdere Kaymakamlık
// NOTE: Fahrettin Altay and Halkapınar are shared with T2 tram, do NOT include here
const METRO_KEYWORDS = [
  'EVKA 3', 'EVKA3', 'EVKA-3',
  'NARLIDERE', 'NARLÍDERE', 'NARLÍDERE',
  'KAYMAKAMLIK', 'KAYMAKAMLÍK', 'KAYMAKAMLIK',
];

// Tram-specific keywords and terminus names
// T1 Karşıyaka: Alaybey ↔ Ataşehir (via Mavişehir)
// T2 Konak: Fahrettin Altay ↔ Halkapınar (via Konak İskele)
// T3 Çiğli: around Çiğli area
const TRAM_KEYWORDS = [
  'ALAYBEY', 'ATASEHIR', 'ATAŞEHİR', 'ATAŞEHIR',
  'FLAMINGO', 'MAVİŞEHİR', 'MAVISEHIR',
  'ÇİĞLİ', 'CIGLI',
  'KARŞIYAKA TRAM', 'KARSIYAKA TRAM',
  'KONAK TRAM',
  // T2 specific stations (to differentiate from metro which shares some termini)
  'KARANTINA', 'KARATAŞ', 'KONAK İSKELE', 'KONAK ISKELE',
];

// Known İZBAN indicators (unique to İZBAN commuter rail)
const IZBAN_KEYWORDS = [
  'İZBAN', 'IZBAN',
  'ALİAĞA', 'ALIAGA', 'ALIAĞA',
  'CUMAOVASI', 'CUMAOVAS',
  'SELÇUK', 'SELCUK',
  'TORBALÍ', 'TORBALI',
  'TEPEKÖY', 'TEPEKOY',
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
 * 4. Check İzmir-specific UNIQUE station/terminus names
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
  if (gtfsType === 3) return 'bus';
  if (gtfsType === 4) return 'ferry';
  // NOTE: gtfsType === 0 falls through to name-based checks below
  // İzmir GTFS uses route_type=0 for ALL transport types before override

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

  // 4. Check İzmir-specific UNIQUE terminus/station names
  if (METRO_KEYWORDS.some(kw => combinedName.includes(kw))) return 'metro';
  if (IZBAN_KEYWORDS.some(kw => combinedName.includes(kw))) return 'izban';
  if (TRAM_KEYWORDS.some(kw => combinedName.includes(kw))) return 'tram';

  // 5. After re-import, route_type=0 means tram (metro=1, izban=2, ferry=4 already caught above).
  //    Before re-import all types are 0, but metro/izban/ferry are caught by name patterns above.
  if (gtfsType === 0) return 'tram';

  // 6. Default to bus (only for route_type=3 or truly unknown)
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
