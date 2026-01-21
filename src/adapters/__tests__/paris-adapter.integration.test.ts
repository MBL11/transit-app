/**
 * Integration tests for Paris Adapter
 * Tests the complete adapter functionality with mocked database
 */

import { ParisAdapter } from '../paris/paris-adapter';
import * as db from '../../core/database';
import { fetchNextDepartures } from '../paris/siri-client';
import { fetchAlerts } from '../paris/alerts';
import { Stop, Route } from '../../core/types/models';

// Mock dependencies
jest.mock('../../core/database');
jest.mock('../paris/siri-client');
jest.mock('../paris/alerts');

describe('ParisAdapter Integration Tests', () => {
  let adapter: ParisAdapter;

  const mockStop: Stop = {
    id: 'IDFM:22092',
    name: 'Châtelet',
    lat: 48.8584,
    lon: 2.3470,
    locationType: 0,
  };

  const mockRoute: Route = {
    id: 'IDFM:C01374',
    shortName: '4',
    longName: 'Métro 4',
    type: 1,
    color: 'BC4C9E',
    textColor: 'FFFFFF',
  };

  beforeEach(() => {
    adapter = new ParisAdapter();
    jest.clearAllMocks();

    // Mock database instance
    const mockDb = {
      execSync: jest.fn(),
      getAllSync: jest.fn(() => []),
      getFirstSync: jest.fn(() => null),
      prepareSync: jest.fn(() => ({
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      })),
    };
    (db.openDatabase as jest.Mock).mockReturnValue(mockDb);
  });

  describe('Configuration', () => {
    it('should have correct Paris configuration', () => {
      const config = adapter.config;

      expect(config.cityName).toBe('Paris');
      expect(config.defaultLocale).toBe('fr');
      expect(config.timezone).toBe('Europe/Paris');
      expect(config.currency).toBe('EUR');
      expect(config.distanceUnit).toBe('metric');
    });
  });

  describe('loadStops', () => {
    it('should load stops from database', async () => {
      const mockStops = [mockStop];
      (db.getAllStops as jest.Mock).mockResolvedValue(mockStops);

      const stops = await adapter.loadStops();

      expect(stops).toEqual(mockStops);
      expect(db.getAllStops).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      (db.getAllStops as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(adapter.loadStops()).rejects.toThrow('Failed to load stops');
    });

    it('should return empty array when no stops exist', async () => {
      (db.getAllStops as jest.Mock).mockResolvedValue([]);

      const stops = await adapter.loadStops();

      expect(stops).toEqual([]);
    });
  });

  describe('loadRoutes', () => {
    it('should load routes from database', async () => {
      const mockDb = {
        getAllSync: jest.fn(() => [
          {
            id: mockRoute.id,
            short_name: mockRoute.shortName,
            long_name: mockRoute.longName,
            type: mockRoute.type,
            color: mockRoute.color,
            text_color: mockRoute.textColor,
          },
        ]),
      };
      (db.openDatabase as jest.Mock).mockReturnValue(mockDb);

      const routes = await adapter.loadRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual(mockRoute);
    });

    it('should handle database errors', async () => {
      const mockDb = {
        getAllSync: jest.fn(() => {
          throw new Error('Database error');
        }),
      };
      (db.openDatabase as jest.Mock).mockReturnValue(mockDb);

      await expect(adapter.loadRoutes()).rejects.toThrow('Failed to load routes');
    });

    it('should return empty array when no routes exist', async () => {
      const mockDb = {
        getAllSync: jest.fn(() => []),
      };
      (db.openDatabase as jest.Mock).mockReturnValue(mockDb);

      const routes = await adapter.loadRoutes();

      expect(routes).toEqual([]);
    });
  });

  describe('getNextDepartures', () => {
    it('should fetch real-time departures when available', async () => {
      const mockDepartures = [
        {
          tripId: 'trip1',
          routeId: 'route1',
          routeShortName: '4',
          routeColor: 'BC4C9E',
          headsign: 'Porte de Clignancourt',
          departureTime: new Date(),
          scheduledTime: new Date(),
          isRealtime: true,
          delay: 0,
        },
      ];
      (fetchNextDepartures as jest.Mock).mockResolvedValue(mockDepartures);

      const departures = await adapter.getNextDepartures(mockStop.id);

      expect(departures).toEqual(mockDepartures);
      expect(fetchNextDepartures).toHaveBeenCalledWith(mockStop.id);
    });

    it('should fallback to theoretical when real-time fails', async () => {
      (fetchNextDepartures as jest.Mock).mockRejectedValue(
        new Error('SIRI API error')
      );

      const mockDb = {
        getAllSync: jest.fn(() => [
          {
            trip_id: 'trip1',
            departure_time: '14:30:00',
            headsign: 'Porte de Clignancourt',
            route_id: 'route1',
            route_short_name: '4',
            route_color: 'BC4C9E',
          },
        ]),
      };
      (db.openDatabase as jest.Mock).mockReturnValue(mockDb);

      const departures = await adapter.getNextDepartures(mockStop.id);

      expect(departures.length).toBeGreaterThan(0);
      expect(departures[0].isRealtime).toBe(false);
    });

    it('should return empty array when no departures found', async () => {
      (fetchNextDepartures as jest.Mock).mockResolvedValue([]);

      const mockDb = {
        getAllSync: jest.fn(() => []),
      };
      (db.openDatabase as jest.Mock).mockReturnValue(mockDb);

      const departures = await adapter.getNextDepartures(mockStop.id);

      expect(departures).toEqual([]);
    });
  });

  describe('getAlerts', () => {
    it('should return empty array (not yet implemented)', async () => {
      // TODO: Alerts API not yet implemented in ParisAdapter
      const alerts = await adapter.getAlerts();

      expect(alerts).toEqual([]);
    });
  });

  // Note: searchStops, searchRoutes, and getStopsInBounds are not yet implemented
  // in ParisAdapter. They will be added when needed.

  describe('searchStops (TODO)', () => {
    it.skip('should search stops by name', async () => {
      // TODO: Implement searchStops method in ParisAdapter
    });
  });

  describe('searchRoutes (TODO)', () => {
    it.skip('should search routes by name or number', async () => {
      // TODO: Implement searchRoutes method in ParisAdapter
    });
  });

  describe('getStopsInBounds (TODO)', () => {
    it.skip('should return stops within geographic bounds', async () => {
      // TODO: Implement getStopsInBounds method in ParisAdapter
    });
  });

  describe('Data Source', () => {
    it('should provide correct data source information', () => {
      const dataSource = adapter.getDataSource();

      expect(dataSource).toBeDefined();
      expect(dataSource.name).toContain('IDFM');
      expect(dataSource.attribution).toBeDefined();
      expect(dataSource.url).toBeDefined();
      expect(dataSource.license).toBeDefined();
    });

    it('should track last update time', () => {
      const lastUpdate = adapter.getLastUpdate();

      expect(lastUpdate).toBeInstanceOf(Date);
    });
  });

  describe('Integration Workflow', () => {
    it('should handle complete workflow: load data -> get departures', async () => {
      // 1. Load stops
      (db.getAllStops as jest.Mock).mockResolvedValue([mockStop]);
      const stops = await adapter.loadStops();
      expect(stops).toHaveLength(1);

      // 2. Get departures for the stop
      const mockDepartures = [
        {
          routeShortName: '4',
          routeLongName: 'Métro 4',
          destination: 'Porte de Clignancourt',
          departureTime: new Date(),
          isRealtime: true,
          routeColor: 'BC4C9E',
          routeTextColor: 'FFFFFF',
          routeType: 1,
        },
      ];
      (fetchNextDepartures as jest.Mock).mockResolvedValue(mockDepartures);
      const departures = await adapter.getNextDepartures(mockStop.id);
      expect(departures).toHaveLength(1);
      expect(departures[0].routeShortName).toBe('4');
    });

    it('should handle offline mode gracefully', async () => {
      // Load routes offline
      const mockDb = {
        getAllSync: jest.fn(() => [
          {
            id: mockRoute.id,
            short_name: mockRoute.shortName,
            long_name: mockRoute.longName,
            type: mockRoute.type,
            color: mockRoute.color,
            text_color: mockRoute.textColor,
          },
        ]),
      };
      (db.openDatabase as jest.Mock).mockReturnValue(mockDb);

      const routes = await adapter.loadRoutes();
      expect(routes).toHaveLength(1);

      // Get theoretical departures (SIRI fails, fallback to theoretical)
      (fetchNextDepartures as jest.Mock).mockRejectedValue(new Error('Offline'));

      mockDb.getAllSync = jest.fn(() => [
        {
          trip_id: 'trip1',
          departure_time: '14:30:00',
          headsign: 'Porte de Clignancourt',
          route_id: 'route1',
          route_short_name: '4',
          route_color: 'BC4C9E',
        },
      ]);

      const departures = await adapter.getNextDepartures(mockStop.id);
      expect(departures.length).toBeGreaterThan(0);
      expect(departures[0].isRealtime).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (db.openDatabase as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot connect to database');
      });

      await expect(adapter.loadRoutes()).rejects.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      const mockDb = {
        getAllSync: jest.fn(() => [
          {
            // Partially valid data
            id: 'route1',
            short_name: null,
            long_name: undefined,
            type: undefined,
            color: null,
            text_color: null,
          },
        ]),
      };
      (db.openDatabase as jest.Mock).mockReturnValue(mockDb);

      // Should not throw, but may have incomplete data
      const routes = await adapter.loadRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].id).toBe('route1');
    });
  });
});
