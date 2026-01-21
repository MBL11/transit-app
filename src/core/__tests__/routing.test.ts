import {
  findRoute,
  findRouteFromAddresses,
  findRouteFromLocations,
  findMultipleRoutes,
} from '../routing';
import * as db from '../database';
import { geocodeAddress } from '../geocoding';
import { findBestNearbyStops } from '../nearby-stops';
import { Stop, Route } from '../types/models';
import { DEFAULT_PREFERENCES } from '../../types/routing-preferences';

// Mock dependencies
jest.mock('../database');
jest.mock('../geocoding');
jest.mock('../nearby-stops');

describe('routing.ts', () => {
  const mockStop1: Stop = {
    id: 'stop1',
    name: 'Châtelet',
    lat: 48.8584,
    lon: 2.3470,
    locationType: 0,
  };

  const mockStop2: Stop = {
    id: 'stop2',
    name: 'Gare du Nord',
    lat: 48.8809,
    lon: 2.3553,
    locationType: 0,
  };

  const mockRoute: Route = {
    id: 'route1',
    shortName: '4',
    longName: 'Métro 4',
    type: 1, // Metro
    color: 'BC4C9E',
    textColor: 'FFFFFF',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findRoute', () => {
    it('should return walking route for short distances (<500m)', async () => {
      // Mock stops that are close together
      const closeStop1: Stop = { ...mockStop1, lat: 48.8584, lon: 2.3470 };
      const closeStop2: Stop = { ...mockStop2, lat: 48.8590, lon: 2.3475 };

      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(closeStop1)
        .mockResolvedValueOnce(closeStop2);

      const result = await findRoute('stop1', 'stop2', new Date());

      expect(result).toHaveLength(1);
      expect(result[0].segments).toHaveLength(1);
      expect(result[0].segments[0].type).toBe('walk');
      expect(result[0].numberOfTransfers).toBe(0);
    });

    it('should throw error if stop not found', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockStop2);

      await expect(findRoute('invalid', 'stop2', new Date()))
        .rejects
        .toThrow('Stop not found');
    });

    it('should find direct route when stops share a common route', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(mockStop1)
        .mockResolvedValueOnce(mockStop2);

      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([mockRoute])
        .mockResolvedValueOnce([mockRoute]);

      const result = await findRoute('stop1', 'stop2', new Date());

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].segments[0].type).toBe('transit');
      expect(result[0].segments[0].route).toEqual(mockRoute);
    });

    it('should return walking fallback when no transit route found', async () => {
      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(mockStop1)
        .mockResolvedValueOnce(mockStop2);

      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await findRoute('stop1', 'stop2', new Date());

      expect(result).toHaveLength(1);
      expect(result[0].segments[0].type).toBe('walk');
    });
  });

  describe('findRouteFromLocations', () => {
    it('should return walking route for very close locations (<500m)', async () => {
      const fromLocation = {
        lat: 48.8584,
        lon: 2.3470,
        displayName: 'Address 1',
        shortAddress: 'Addr 1',
      };

      const toLocation = {
        lat: 48.8590,
        lon: 2.3475,
        displayName: 'Address 2',
        shortAddress: 'Addr 2',
      };

      const result = await findRouteFromLocations(
        fromLocation,
        toLocation,
        new Date()
      );

      expect(result).toHaveLength(1);
      expect(result[0].segments).toHaveLength(1);
      expect(result[0].segments[0].type).toBe('walk');
    });

    it('should throw error when no nearby stops found', async () => {
      const fromLocation = {
        lat: 48.8584,
        lon: 2.3470,
        displayName: 'Address 1',
        shortAddress: 'Addr 1',
      };

      const toLocation = {
        lat: 49.8584, // Far away
        lon: 3.3470,
        displayName: 'Address 2',
        shortAddress: 'Addr 2',
      };

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([]) // No from stops
        .mockResolvedValueOnce([mockStop2]);

      await expect(
        findRouteFromLocations(fromLocation, toLocation, new Date())
      ).rejects.toThrow(/Aucun arrêt trouvé/);
    });

    it('should find routes with walking segments when stops are found', async () => {
      const fromLocation = {
        lat: 48.8584,
        lon: 2.3470,
        displayName: 'Address 1',
        shortAddress: 'Addr 1',
      };

      const toLocation = {
        lat: 48.8809,
        lon: 2.3553,
        displayName: 'Address 2',
        shortAddress: 'Addr 2',
      };

      const nearbyFromStops = [{ ...mockStop1, distance: 200 }];
      const nearbyToStops = [{ ...mockStop2, distance: 300 }];

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce(nearbyFromStops)
        .mockResolvedValueOnce(nearbyToStops);

      (db.getStopById as jest.Mock)
        .mockResolvedValueOnce(mockStop1)
        .mockResolvedValueOnce(mockStop2);

      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValueOnce([mockRoute])
        .mockResolvedValueOnce([mockRoute]);

      const result = await findRouteFromLocations(
        fromLocation,
        toLocation,
        new Date()
      );

      expect(result.length).toBeGreaterThan(0);
      // Should have walking segments at start and end
      expect(result[0].segments[0].type).toBe('walk');
      expect(result[0].segments[result[0].segments.length - 1].type).toBe('walk');
    });
  });

  describe('findRouteFromAddresses', () => {
    it('should geocode addresses and find routes', async () => {
      const fromGeoResult = {
        lat: 48.8584,
        lon: 2.3470,
        displayName: 'Châtelet, Paris',
        shortAddress: 'Châtelet',
      };

      const toGeoResult = {
        lat: 48.8809,
        lon: 2.3553,
        displayName: 'Gare du Nord, Paris',
        shortAddress: 'Gare du Nord',
      };

      (geocodeAddress as jest.Mock)
        .mockResolvedValueOnce([fromGeoResult])
        .mockResolvedValueOnce([toGeoResult]);

      const nearbyFromStops = [{ ...mockStop1, distance: 200 }];
      const nearbyToStops = [{ ...mockStop2, distance: 300 }];

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce(nearbyFromStops)
        .mockResolvedValueOnce(nearbyToStops);

      (db.getStopById as jest.Mock)
        .mockResolvedValue(mockStop1);

      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([mockRoute]);

      const result = await findRouteFromAddresses(
        'Châtelet',
        'Gare du Nord',
        new Date(),
        'fr'
      );

      expect(geocodeAddress).toHaveBeenCalledTimes(2);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error when geocoding fails', async () => {
      (geocodeAddress as jest.Mock)
        .mockResolvedValueOnce([]) // Empty results
        .mockResolvedValueOnce([]);

      await expect(
        findRouteFromAddresses('Invalid', 'Address', new Date())
      ).rejects.toThrow(/Could not find starting address/);
    });

    it('should always include walking option', async () => {
      const fromGeoResult = {
        lat: 48.8584,
        lon: 2.3470,
        displayName: 'Châtelet, Paris',
        shortAddress: 'Châtelet',
      };

      const toGeoResult = {
        lat: 48.8809,
        lon: 2.3553,
        displayName: 'Gare du Nord, Paris',
        shortAddress: 'Gare du Nord',
      };

      (geocodeAddress as jest.Mock)
        .mockResolvedValueOnce([fromGeoResult])
        .mockResolvedValueOnce([toGeoResult]);

      // Mock findBestNearbyStops to return empty arrays (no transit available)
      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await findRouteFromAddresses(
        'Châtelet',
        'Gare du Nord',
        new Date()
      );

      // Should always have at least one result (walking)
      expect(result.length).toBeGreaterThan(0);
      // First result should include walking
      const hasWalking = result.some(r =>
        r.segments.some(s => s.type === 'walk')
      );
      expect(hasWalking).toBe(true);
    });
  });

  describe('findMultipleRoutes', () => {
    it('should return filtered routes based on preferences', async () => {
      const fromLocation = {
        lat: 48.8584,
        lon: 2.3470,
        displayName: 'Address 1',
        shortAddress: 'Addr 1',
      };

      const toLocation = {
        lat: 48.8809,
        lon: 2.3553,
        displayName: 'Address 2',
        shortAddress: 'Addr 2',
      };

      const nearbyFromStops = [{ ...mockStop1, distance: 200 }];
      const nearbyToStops = [{ ...mockStop2, distance: 300 }];

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce(nearbyFromStops)
        .mockResolvedValueOnce(nearbyToStops);

      (db.getStopById as jest.Mock)
        .mockResolvedValue(mockStop1);

      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([mockRoute]);

      const preferences = {
        ...DEFAULT_PREFERENCES,
        optimizeFor: 'fastest' as const,
        maxTransfers: 1,
      };

      const result = await findMultipleRoutes(
        fromLocation,
        toLocation,
        new Date(),
        preferences,
        3
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should add tags to routes', async () => {
      const fromLocation = {
        lat: 48.8584,
        lon: 2.3470,
        displayName: 'Address 1',
        shortAddress: 'Addr 1',
      };

      const toLocation = {
        lat: 48.8809,
        lon: 2.3553,
        displayName: 'Address 2',
        shortAddress: 'Addr 2',
      };

      const nearbyFromStops = [{ ...mockStop1, distance: 200 }];
      const nearbyToStops = [{ ...mockStop2, distance: 300 }];

      (findBestNearbyStops as jest.Mock)
        .mockResolvedValueOnce(nearbyFromStops)
        .mockResolvedValueOnce(nearbyToStops);

      (db.getStopById as jest.Mock)
        .mockResolvedValue(mockStop1);

      (db.getRoutesByStopId as jest.Mock)
        .mockResolvedValue([mockRoute]);

      const result = await findMultipleRoutes(
        fromLocation,
        toLocation,
        new Date(),
        DEFAULT_PREFERENCES,
        3
      );

      // Routes should have tags
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('tags');
      }
    });
  });
});
