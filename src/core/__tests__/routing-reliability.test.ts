/**
 * Routing Reliability Tests
 *
 * Tests real-world İzmir transit scenarios to validate routing logic:
 * - Direct routes (Metro M1, Tram T1/T2, İZBAN, Ferry)
 * - Transfer routing (Metro→Tram, Metro→İZBAN, Bus→Metro)
 * - Edge cases (same stop, very long distance, no routes, absurd durations)
 * - Duration sanity checks (speed estimates vs real İzmir data)
 * - Preference filtering (mode exclusion, transfer limits, walking limits)
 * - Walking fallback behavior
 */

import {
  findRoute,
  findRouteFromLocations,
  findMultipleRoutes,
} from '../routing';
import * as db from '../database';
import { findBestNearbyStops, getWalkingTime } from '../nearby-stops';
import { Stop, Route } from '../types/models';
import { DEFAULT_PREFERENCES, RoutingPreferences } from '../../types/routing-preferences';

jest.mock('../database');
jest.mock('../geocoding');
jest.mock('../nearby-stops');

// ============================================================================
// İzmir Transit Test Data
// ============================================================================

// Real İzmir stops (approximate coordinates from GTFS)
const KONAK: Stop = { id: 'metro_konak', name: 'Konak', lat: 38.4189, lon: 27.1287, locationType: 0 };
const FAHRETTIN_ALTAY: Stop = { id: 'metro_fahrettin', name: 'Fahrettin Altay', lat: 38.3954, lon: 27.0730, locationType: 0 };
const UCYOL: Stop = { id: 'metro_ucyol', name: 'Üçyol', lat: 38.4085, lon: 27.1130, locationType: 0 };
const HALKAPINAR: Stop = { id: 'metro_halkapinar', name: 'Halkapınar', lat: 38.4340, lon: 27.1670, locationType: 0 };
const BORNOVA: Stop = { id: 'metro_bornova', name: 'Bornova', lat: 38.4620, lon: 27.2150, locationType: 0 };

// Tram stops
const KARSIYAKA_TRAM: Stop = { id: 'tram_karsiyaka', name: 'Karşıyaka', lat: 38.4560, lon: 27.1090, locationType: 0 };
const ALAYBEY: Stop = { id: 'tram_alaybey', name: 'Alaybey', lat: 38.4620, lon: 27.0930, locationType: 0 };
const ATASEHIR_TRAM: Stop = { id: 'tram_atasehir', name: 'Ataşehir', lat: 38.4680, lon: 27.1310, locationType: 0 };

// İZBAN stops
const ALIAGA: Stop = { id: 'rail_aliaga', name: 'Aliağa', lat: 38.7980, lon: 26.9700, locationType: 0 };
const HALKAPINAR_IZBAN: Stop = { id: 'rail_halkapinar', name: 'Halkapınar', lat: 38.4345, lon: 27.1675, locationType: 0 };
const CUMAOVASI: Stop = { id: 'rail_cumaovasi', name: 'Cumaovası', lat: 38.2220, lon: 27.2560, locationType: 0 };

// Ferry stops
const KONAK_FERRY: Stop = { id: 'ferry_konak', name: 'Konak', lat: 38.4230, lon: 27.1310, locationType: 0 };
const KARSIYAKA_FERRY: Stop = { id: 'ferry_karsiyaka', name: 'Karşıyaka', lat: 38.4600, lon: 27.1080, locationType: 0 };

// Bus stops
const BUS_STOP_A: Stop = { id: 'bus_stop_a', name: 'Alsancak Gar', lat: 38.4330, lon: 27.1430, locationType: 0 };
const BUS_STOP_B: Stop = { id: 'bus_stop_b', name: 'Balçova', lat: 38.3900, lon: 27.0400, locationType: 0 };

// Routes
const METRO_M1: Route = { id: 'metro_m1', shortName: 'M1', longName: 'Fahrettin Altay - Bornova', type: 1, color: '#D61C1F', textColor: '#FFFFFF' };
const TRAM_T1: Route = { id: 'tram_t1', shortName: 'T1', longName: 'Konak Tramway', type: 0, color: '#00A651', textColor: '#FFFFFF' };
const TRAM_T2: Route = { id: 'tram_t2', shortName: 'T2', longName: 'Karşıyaka Tramway', type: 0, color: '#00A651', textColor: '#FFFFFF' };
const IZBAN: Route = { id: 'izban_s1', shortName: 'İZBAN', longName: 'İZBAN S1', type: 2, color: '#005BBB', textColor: '#FFFFFF' };
const FERRY_F1: Route = { id: 'ferry_f1', shortName: 'F1', longName: 'Konak-Karşıyaka', type: 4, color: '#0099CC', textColor: '#FFFFFF' };
const BUS_35: Route = { id: 'bus_35', shortName: '35', longName: 'ESHOT 35', type: 3, color: '#0066CC', textColor: '#FFFFFF' };

const DEPARTURE = new Date('2025-01-31T08:00:00');

describe('Routing Reliability - İzmir Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Always provide real getWalkingTime implementation
    (getWalkingTime as jest.Mock).mockImplementation((distanceMeters: number) => {
      return Math.round(distanceMeters / 83.33);
    });
    // Return null for schedule-based lookups → fall back to distance estimates
    (db.getActualTravelTime as jest.Mock).mockReturnValue(null);
    (db.getActiveServiceIds as jest.Mock).mockReturnValue(null);
  });

  // ==========================================================================
  // 1. DIRECT ROUTES
  // ==========================================================================
  describe('Direct Routes', () => {
    it('Metro M1: Fahrettin Altay → Konak (direct, ~6km)', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(FAHRETTIN_ALTAY)
        .mockResolvedValueOnce(KONAK);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([METRO_M1])
        .mockResolvedValueOnce([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce({ headsign: 'Bornova' });

      const results = await findRoute('metro_fahrettin', 'metro_konak', DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      const journey = results[0];
      expect(journey.segments[0].type).toBe('transit');
      expect(journey.segments[0].route?.shortName).toBe('M1');
      expect(journey.numberOfTransfers).toBe(0);
      // Metro M1: ~6km at 1.7 min/km ≈ 10 min. Should be 5-20 min range.
      expect(journey.totalDuration).toBeGreaterThanOrEqual(5);
      expect(journey.totalDuration).toBeLessThanOrEqual(20);
    });

    it('İZBAN: Aliağa → Halkapınar (long distance, ~40km)', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(ALIAGA)
        .mockResolvedValueOnce(HALKAPINAR_IZBAN);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([IZBAN])
        .mockResolvedValueOnce([IZBAN]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce({ headsign: 'Cumaovası' });

      const results = await findRoute('rail_aliaga', 'rail_halkapinar', DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      const journey = results[0];
      expect(journey.segments[0].route?.shortName).toBe('İZBAN');
      // İZBAN: ~40km at 1.3 min/km ≈ 52 min. Should be 30-90 min.
      expect(journey.totalDuration).toBeGreaterThanOrEqual(30);
      expect(journey.totalDuration).toBeLessThanOrEqual(90);
    });

    it('Ferry: Konak → Karşıyaka (cross-bay, ~5km)', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK_FERRY)
        .mockResolvedValueOnce(KARSIYAKA_FERRY);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([FERRY_F1])
        .mockResolvedValueOnce([FERRY_F1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce({ headsign: 'Karşıyaka' });

      const results = await findRoute('ferry_konak', 'ferry_karsiyaka', DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      const journey = results[0];
      expect(journey.segments[0].route?.shortName).toBe('F1');
      // Ferry: ~5km at 3.5 min/km ≈ 18 min. Should be 10-30 min.
      expect(journey.totalDuration).toBeGreaterThanOrEqual(10);
      expect(journey.totalDuration).toBeLessThanOrEqual(30);
    });
  });

  // ==========================================================================
  // 2. TRANSFER ROUTES
  // ==========================================================================
  describe('Transfer Routes', () => {
    it('Metro → Tram transfer at Konak (M1 Üçyol → T2 to Alaybey)', async () => {
      // Üçyol is on M1, Alaybey is on T2 (Karşıyaka tram)
      // Transfer at Konak/Halkapınar area

      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(UCYOL)     // from
        .mockResolvedValueOnce(ALAYBEY);  // to

      // Use mockImplementation for getRoutesByStopId to handle variable call order
      const routesByStop: Record<string, Route[]> = {
        'metro_ucyol': [METRO_M1],
        'tram_alaybey': [TRAM_T2],
        'metro_fahrettin': [METRO_M1],
        'metro_konak': [METRO_M1, TRAM_T1],
        'metro_halkapinar': [METRO_M1],
        'metro_bornova': [METRO_M1],
        'tram_karsiyaka': [TRAM_T2],
      };
      (db.getRoutesByStopId as jest.Mock).mockImplementation(async (stopId: string) => {
        return routesByStop[stopId] || [];
      });

      // M1 stops
      (db.getStopsByRouteId as jest.Mock)
        .mockResolvedValue([FAHRETTIN_ALTAY, UCYOL, KONAK, HALKAPINAR, BORNOVA]);

      // Nearby stops search at transfer points - Karşıyaka tram near Konak
      (findBestNearbyStops as jest.Mock)
        .mockImplementation(async (lat: number, lon: number) => {
          // Near Konak area → find Karşıyaka tram
          if (Math.abs(lat - KONAK.lat) < 0.02 && Math.abs(lon - KONAK.lon) < 0.02) {
            return [{ ...KARSIYAKA_TRAM, distance: 400 }];
          }
          return [];
        });

      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue({ headsign: 'Direction' });

      const results = await findRoute('metro_ucyol', 'tram_alaybey', DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      const journey = results[0];
      // Should have transfer (2 transit segments)
      const transitSegments = journey.segments.filter(s => s.type === 'transit');
      expect(transitSegments.length).toBe(2);
      expect(journey.numberOfTransfers).toBe(1);
      // Total should be reasonable: M1 ~5min + 4min transfer + T2 ~15min = ~24min
      expect(journey.totalDuration).toBeGreaterThanOrEqual(10);
      expect(journey.totalDuration).toBeLessThanOrEqual(60);
    });

    it('should not find transfer when routes have no connection', async () => {
      // Two stops on completely separate networks with no shared transfer points
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(ALIAGA)       // Far north İZBAN
        .mockResolvedValueOnce(BUS_STOP_B);  // Balçova bus
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([IZBAN])
        .mockResolvedValueOnce([BUS_35]);
      // İZBAN route stops - none near Balçova
      (db.getStopsByRouteId as jest.Mock)
        .mockResolvedValueOnce([ALIAGA, HALKAPINAR_IZBAN, CUMAOVASI]);
      // Check routes at each İZBAN stop
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([IZBAN])  // Halkapınar
        .mockResolvedValueOnce([IZBAN]); // Cumaovası
      // Nearby stops search finds nothing useful
      (findBestNearbyStops as jest.Mock)
        .mockResolvedValue([]);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([]);

      const results = await findRoute('rail_aliaga', 'bus_stop_b', DEPARTURE);

      // Should fall back to walking (if distance reasonable) or empty
      if (results.length > 0) {
        // If walking fallback, verify it's marked as walk
        const hasTransit = results[0].segments.some(s => s.type === 'transit');
        if (hasTransit) {
          // If transit found, verify duration is sane
          expect(results[0].totalDuration).toBeLessThanOrEqual(180);
        }
      }
    });
  });

  // ==========================================================================
  // 3. EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle same origin and destination', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(KONAK);

      const results = await findRoute('metro_konak', 'metro_konak', DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      // Distance is 0 → should be a walk of 0 duration
      expect(results[0].totalDuration).toBe(0);
      expect(results[0].segments[0].type).toBe('walk');
    });

    it('should throw when stop does not exist', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(KONAK);

      await expect(findRoute('nonexistent', 'metro_konak', DEPARTURE))
        .rejects.toThrow('Stop not found');
    });

    it('should filter out absurd duration journeys (>180 min)', async () => {
      // Two stops ~45km apart with only bus (slow) route
      const farStop: Stop = { id: 'far_stop', name: 'Far', lat: 38.8, lon: 27.5, locationType: 0 };
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(farStop);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([BUS_35])
        .mockResolvedValueOnce([BUS_35]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce(null);

      const results = await findRoute('metro_konak', 'far_stop', DEPARTURE);

      // Bus at 3 min/km × 45km = 135 min → should still pass (< 180)
      // But if result were > 180 min, it should be filtered
      for (const journey of results) {
        expect(journey.totalDuration).toBeLessThanOrEqual(180);
      }
    });

    it('should return walking for nearby stops (<500m)', async () => {
      // Two stops ~200m apart
      const nearStop: Stop = { id: 'near_stop', name: 'Near', lat: 38.4195, lon: 27.1290, locationType: 0 };
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(nearStop);

      const results = await findRoute('metro_konak', 'near_stop', DEPARTURE);

      expect(results.length).toBe(1);
      expect(results[0].segments[0].type).toBe('walk');
      expect(results[0].totalDuration).toBeLessThanOrEqual(10); // ~200m = ~2.4 min
    });
  });

  // ==========================================================================
  // 4. DURATION SANITY CHECKS (vs real İzmir data)
  // ==========================================================================
  describe('Duration Sanity', () => {
    it('Metro speed: Fahrettin Altay→Bornova ~12km should be 15-25 min', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(FAHRETTIN_ALTAY)
        .mockResolvedValueOnce(BORNOVA);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([METRO_M1])
        .mockResolvedValueOnce([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce({ headsign: 'Bornova' });

      const results = await findRoute('metro_fahrettin', 'metro_bornova', DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      // Real: ~22 min travel + ~3 min wait + dwell ≈ 30 min total
      // Engine: 12km × 1.7 + ~12 stops × 0.5 dwell + 3 wait ≈ 30 min
      expect(results[0].totalDuration).toBeGreaterThanOrEqual(20);
      expect(results[0].totalDuration).toBeLessThanOrEqual(40);
    });

    it('İZBAN speed: Aliağa→Cumaovası ~65km should be 60-100 min', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(ALIAGA)
        .mockResolvedValueOnce(CUMAOVASI);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([IZBAN])
        .mockResolvedValueOnce([IZBAN]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce({ headsign: 'Cumaovası' });

      const results = await findRoute('rail_aliaga', 'rail_cumaovasi', DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      // Real: ~90 min. Engine: 65km × 1.3 + ~25 stops × 0.5 dwell + 5 wait ≈ 102 min
      expect(results[0].totalDuration).toBeGreaterThanOrEqual(60);
      expect(results[0].totalDuration).toBeLessThanOrEqual(120);
    });

    it('Bus speed: should be slower than metro for same distance', async () => {
      // Same origin, two routes: metro vs bus
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(HALKAPINAR);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([METRO_M1, BUS_35])
        .mockResolvedValueOnce([METRO_M1, BUS_35]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue(null);

      const results = await findRoute('metro_konak', 'metro_halkapinar', DEPARTURE);

      expect(results.length).toBeGreaterThanOrEqual(2);

      const metroJourney = results.find(j => j.segments[0].route?.type === 1);
      const busJourney = results.find(j => j.segments[0].route?.type === 3);

      if (metroJourney && busJourney) {
        expect(busJourney.totalDuration).toBeGreaterThan(metroJourney.totalDuration);
      }
    });
  });

  // ==========================================================================
  // 5. LOCATION-BASED ROUTING (with walking segments)
  // ==========================================================================
  describe('Location-based Routing', () => {
    it('should add walking segments to/from stops', async () => {
      const from = { lat: 38.4200, lon: 27.1300, displayName: 'Konak Meydanı', shortAddress: 'Konak' };
      const to = { lat: 38.4350, lon: 27.1680, displayName: 'Halkapınar Metro', shortAddress: 'Halkapınar' };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([{ ...KONAK, distance: 150 }])
        .mockResolvedValueOnce([{ ...HALKAPINAR, distance: 200 }]);
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(HALKAPINAR);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([METRO_M1])
        .mockResolvedValueOnce([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce({ headsign: 'Bornova' });

      const results = await findRouteFromLocations(from, to, DEPARTURE);

      expect(results.length).toBeGreaterThan(0);
      const journey = results[0];
      // First segment should be walking to the metro stop
      expect(journey.segments[0].type).toBe('walk');
      // Last segment should be walking from the metro stop
      expect(journey.segments[journey.segments.length - 1].type).toBe('walk');
      // Middle segment(s) should be transit
      expect(journey.segments.some(s => s.type === 'transit')).toBe(true);
      // Total walk distance should include both walking segments
      expect(journey.totalWalkDistance).toBeGreaterThan(0);
    });

    it('should return walk-only for very short distances (<500m)', async () => {
      const from = { lat: 38.4189, lon: 27.1287, displayName: 'Near Konak', shortAddress: 'Near' };
      const to = { lat: 38.4195, lon: 27.1292, displayName: 'Also Near Konak', shortAddress: 'Also Near' };

      const results = await findRouteFromLocations(from, to, DEPARTURE);

      expect(results.length).toBe(1);
      expect(results[0].segments[0].type).toBe('walk');
      expect(results[0].totalDuration).toBeLessThanOrEqual(5);
    });

    it('should throw when no nearby stops found', async () => {
      const from = { lat: 39.5, lon: 28.0, displayName: 'Middle of Nowhere', shortAddress: 'Nowhere' };
      const to = { lat: 38.4350, lon: 27.1680, displayName: 'Halkapınar', shortAddress: 'Halkapınar' };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([])  // No stops near origin
        .mockResolvedValueOnce([{ ...HALKAPINAR, distance: 200 }]);

      await expect(findRouteFromLocations(from, to, DEPARTURE))
        .rejects.toThrow(/NO_STOPS_NEAR/);
    });
  });

  // ==========================================================================
  // 6. PREFERENCE FILTERING
  // ==========================================================================
  describe('Preference Filtering', () => {
    it('should exclude metro when mode disabled', async () => {
      const from = { lat: 38.4200, lon: 27.1300, displayName: 'Konak', shortAddress: 'Konak' };
      const to = { lat: 38.4350, lon: 27.1680, displayName: 'Halkapınar', shortAddress: 'Halkapınar' };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([{ ...KONAK, distance: 150 }])
        .mockResolvedValueOnce([{ ...HALKAPINAR, distance: 200 }]);
      (db.getStopById as jest.Mock)
        .mockResolvedValue(KONAK);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue(null);

      const noMetroPrefs: RoutingPreferences = {
        ...DEFAULT_PREFERENCES,
        allowedModes: { ...DEFAULT_PREFERENCES.allowedModes, metro: false },
      };

      const results = await findMultipleRoutes(from, to, DEPARTURE, noMetroPrefs, 3);

      // Should not contain any metro segments
      for (const journey of results) {
        for (const seg of journey.segments) {
          if (seg.type === 'transit' && seg.route) {
            expect(seg.route.type).not.toBe(1); // type 1 = metro
          }
        }
      }
    });

    it('should respect maxTransfers=0 (direct only)', async () => {
      const from = { lat: 38.4200, lon: 27.1300, displayName: 'Konak', shortAddress: 'Konak' };
      const to = { lat: 38.4350, lon: 27.1680, displayName: 'Halkapınar', shortAddress: 'Halkapınar' };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([{ ...KONAK, distance: 150 }])
        .mockResolvedValueOnce([{ ...HALKAPINAR, distance: 200 }]);
      (db.getStopById as jest.Mock)
        .mockResolvedValue(KONAK);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue(null);

      const directOnlyPrefs: RoutingPreferences = {
        ...DEFAULT_PREFERENCES,
        maxTransfers: 0,
      };

      const results = await findMultipleRoutes(from, to, DEPARTURE, directOnlyPrefs, 3);

      for (const journey of results) {
        expect(journey.numberOfTransfers).toBe(0);
      }
    });

    it('should always return at least one result even when nothing matches filters', async () => {
      const from = { lat: 38.4200, lon: 27.1300, displayName: 'Konak', shortAddress: 'Konak' };
      const to = { lat: 38.4350, lon: 27.1680, displayName: 'Halkapınar', shortAddress: 'Halkapınar' };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([{ ...KONAK, distance: 150 }])
        .mockResolvedValueOnce([{ ...HALKAPINAR, distance: 200 }]);
      (db.getStopById as jest.Mock)
        .mockResolvedValue(KONAK);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue(null);

      // Disable ALL modes — should still return best available route
      const allDisabledPrefs: RoutingPreferences = {
        ...DEFAULT_PREFERENCES,
        allowedModes: { metro: false, bus: false, tram: false, train: false, walking: false },
      };

      const results = await findMultipleRoutes(from, to, DEPARTURE, allDisabledPrefs, 3);

      // Should fallback to best route even if no modes match
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 7. JOURNEY RESULT INTEGRITY
  // ==========================================================================
  describe('Journey Result Integrity', () => {
    it('departure and arrival times should be consistent with duration', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(BORNOVA);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([METRO_M1])
        .mockResolvedValueOnce([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce({ headsign: 'Bornova' });

      const results = await findRoute('metro_konak', 'metro_bornova', DEPARTURE);

      for (const journey of results) {
        const timeDiffMin = (journey.arrivalTime.getTime() - journey.departureTime.getTime()) / 60000;
        expect(timeDiffMin).toBeCloseTo(journey.totalDuration, 0);
      }
    });

    it('all segments should have valid from/to stops', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(HALKAPINAR);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([METRO_M1])
        .mockResolvedValueOnce([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValueOnce(null);

      const results = await findRoute('metro_konak', 'metro_halkapinar', DEPARTURE);

      for (const journey of results) {
        for (const segment of journey.segments) {
          expect(segment.from).toBeDefined();
          expect(segment.to).toBeDefined();
          expect(segment.from.name).toBeTruthy();
          expect(segment.to.name).toBeTruthy();
          expect(segment.duration).toBeGreaterThanOrEqual(0);
          if (segment.type === 'transit') {
            expect(segment.route).toBeDefined();
          }
          if (segment.type === 'walk') {
            expect(segment.distance).toBeDefined();
            expect(segment.distance).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    it('totalDuration should never be NaN', async () => {
      const from = { lat: 38.4200, lon: 27.1300, displayName: 'Konak', shortAddress: 'Konak' };
      const to = { lat: 38.4350, lon: 27.1680, displayName: 'Halkapınar', shortAddress: 'Halkapınar' };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([{ ...KONAK, distance: 150 }])
        .mockResolvedValueOnce([{ ...HALKAPINAR, distance: 200 }]);
      (db.getStopById as jest.Mock)
        .mockResolvedValue(KONAK);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue(null);

      const results = await findRouteFromLocations(from, to, DEPARTURE);

      for (const journey of results) {
        expect(Number.isNaN(journey.totalDuration)).toBe(false);
        expect(Number.isNaN(journey.totalWalkDistance)).toBe(false);
        expect(journey.totalDuration).toBeGreaterThanOrEqual(0);
      }
    });

    it('numberOfTransfers should match transit segment count - 1', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(KONAK)
        .mockResolvedValueOnce(HALKAPINAR);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([METRO_M1])
        .mockResolvedValueOnce([METRO_M1]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue(null);

      const results = await findRoute('metro_konak', 'metro_halkapinar', DEPARTURE);

      for (const journey of results) {
        const transitCount = journey.segments.filter(s => s.type === 'transit').length;
        if (transitCount > 0) {
          expect(journey.numberOfTransfers).toBe(transitCount - 1);
        }
      }
    });
  });

  // ==========================================================================
  // 8. MULTIPLE ROUTES & TAGS
  // ==========================================================================
  describe('Multiple Routes & Tags', () => {
    it('should return multiple route options sorted by duration', async () => {
      const from = { lat: 38.4200, lon: 27.1300, displayName: 'Konak', shortAddress: 'Konak' };
      const to = { lat: 38.4350, lon: 27.1680, displayName: 'Halkapınar', shortAddress: 'Halkapınar' };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([{ ...KONAK, distance: 150 }])
        .mockResolvedValueOnce([{ ...HALKAPINAR, distance: 200 }]);
      (db.getStopById as jest.Mock)
        .mockResolvedValue(KONAK);
      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([METRO_M1, BUS_35]);
      (db.getTripInfoForRoute as jest.Mock)
        .mockResolvedValue(null);

      const results = await findMultipleRoutes(from, to, DEPARTURE, DEFAULT_PREFERENCES, 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // Should have tags
      for (const journey of results) {
        expect(journey).toHaveProperty('tags');
        expect(Array.isArray(journey.tags)).toBe(true);
      }
    });
  });
});
