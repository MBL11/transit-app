import {
  openDatabase,
  initializeDatabase,
  getDatabaseStats,
  isDatabaseEmpty,
  clearAllData,
  insertStops,
  insertRoutes,
  insertTrips,
  getAllStops,
  getAllRoutes,
  getStopById,
  getRouteById,
  getRoutesByStopId,
  getStopsInBounds,
  searchStops,
  searchRoutes,
  getStopsByRouteId,
} from '../database';
import { Stop, Route, Trip } from '../types/models';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite');

describe('database.ts', () => {
  let mockDb: any;

  beforeEach(() => {
    // Create a mock database instance
    mockDb = {
      execSync: jest.fn(),
      runSync: jest.fn(),
      getAllSync: jest.fn(() => []),
      getFirstSync: jest.fn(() => null),
      prepareSync: jest.fn(() => ({
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      })),
    };

    // Mock openDatabaseSync to return our mock
    (SQLite.openDatabaseSync as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('openDatabase', () => {
    it('should open database with correct name', () => {
      const db = openDatabase();

      expect(SQLite.openDatabaseSync).toHaveBeenCalledWith('transit.db');
      expect(db).toBe(mockDb);
    });
  });

  describe('initializeDatabase', () => {
    it('should create all necessary tables', async () => {
      await initializeDatabase();

      expect(mockDb.execSync).toHaveBeenCalled();

      // Check that CREATE TABLE statements were executed
      const calls = (mockDb.execSync as jest.Mock).mock.calls;
      const sqlStatements = calls.map(call => call[0]);

      expect(sqlStatements.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS stops'))).toBe(true);
      expect(sqlStatements.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS routes'))).toBe(true);
      expect(sqlStatements.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS trips'))).toBe(true);
      expect(sqlStatements.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS stop_times'))).toBe(true);
    });

    it('should create indexes for performance', async () => {
      await initializeDatabase();

      const calls = (mockDb.execSync as jest.Mock).mock.calls;
      const sqlStatements = calls.map(call => call[0]);

      expect(sqlStatements.some((sql: string) => sql.includes('CREATE INDEX'))).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockDb.execSync.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(initializeDatabase()).rejects.toThrow('Database error');
    });
  });

  describe('getDatabaseStats', () => {
    it('should return counts for all tables', () => {
      mockDb.getFirstSync
        .mockReturnValueOnce({ count: 100 }) // stops
        .mockReturnValueOnce({ count: 20 })  // routes
        .mockReturnValueOnce({ count: 500 }) // trips
        .mockReturnValueOnce({ count: 5000 }); // stop_times

      const stats = getDatabaseStats();

      expect(stats).toEqual({
        stops: 100,
        routes: 20,
        trips: 500,
        stopTimes: 5000,
      });
    });

    it('should return 0 when tables are empty', () => {
      mockDb.getFirstSync.mockReturnValue(null);

      const stats = getDatabaseStats();

      expect(stats).toEqual({
        stops: 0,
        routes: 0,
        trips: 0,
        stopTimes: 0,
      });
    });
  });

  describe('isDatabaseEmpty', () => {
    it('should return true when database has no data', () => {
      mockDb.getFirstSync.mockReturnValue({ count: 0 });

      const result = isDatabaseEmpty();

      expect(result).toBe(true);
    });

    it('should return false when database has stops', () => {
      mockDb.getFirstSync
        .mockReturnValueOnce({ count: 100 })
        .mockReturnValueOnce({ count: 20 });

      const result = isDatabaseEmpty();

      expect(result).toBe(false);
    });
  });

  describe('clearAllData', () => {
    it('should delete all data from all tables', async () => {
      await clearAllData();

      expect(mockDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
      expect(mockDb.execSync).toHaveBeenCalledWith('DELETE FROM stop_times;');
      expect(mockDb.execSync).toHaveBeenCalledWith('DELETE FROM trips;');
      expect(mockDb.execSync).toHaveBeenCalledWith('DELETE FROM routes;');
      expect(mockDb.execSync).toHaveBeenCalledWith('DELETE FROM stops;');
      expect(mockDb.execSync).toHaveBeenCalledWith('COMMIT;');
    });

    it('should rollback on error', async () => {
      // Only throw on DELETE calls, allow other execSync calls (CREATE TABLE, PRAGMA, etc.)
      mockDb.execSync.mockImplementation((sql: string) => {
        if (sql.includes('DELETE')) {
          throw new Error('Delete failed');
        }
      });

      await expect(clearAllData()).rejects.toThrow('Delete failed');
      expect(mockDb.execSync).toHaveBeenCalledWith('ROLLBACK;');
    });
  });

  describe('insertStops', () => {
    it('should insert stops in a transaction', async () => {
      const stops: Stop[] = [
        {
          id: 'stop1',
          name: 'Châtelet',
          lat: 48.8584,
          lon: 2.3470,
          locationType: 0,
        },
        {
          id: 'stop2',
          name: 'Gare du Nord',
          lat: 48.8809,
          lon: 2.3553,
          locationType: 0,
        },
      ];

      const mockStatement = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStatement);

      await insertStops(stops);

      expect(mockDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
      expect(mockStatement.executeSync).toHaveBeenCalledTimes(stops.length);
      expect(mockStatement.finalizeSync).toHaveBeenCalled();
      expect(mockDb.execSync).toHaveBeenCalledWith('COMMIT;');
    });

    it('should rollback on error', async () => {
      const stops: Stop[] = [
        { id: 'stop1', name: 'Test', lat: 0, lon: 0, locationType: 0 },
      ];

      const mockStatement = {
        executeSync: jest.fn(() => { throw new Error('Insert failed'); }),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStatement);

      await expect(insertStops(stops)).rejects.toThrow('Insert failed');
      expect(mockDb.execSync).toHaveBeenCalledWith('ROLLBACK;');
    });
  });

  describe('insertRoutes', () => {
    it('should insert routes in a transaction', async () => {
      const routes: Route[] = [
        {
          id: 'route1',
          shortName: '4',
          longName: 'Métro 4',
          type: 1,
          color: 'BC4C9E',
          textColor: 'FFFFFF',
        },
      ];

      const mockStatement = {
        executeSync: jest.fn(),
        finalizeSync: jest.fn(),
      };
      mockDb.prepareSync.mockReturnValue(mockStatement);

      await insertRoutes(routes);

      expect(mockDb.execSync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
      expect(mockStatement.executeSync).toHaveBeenCalledTimes(routes.length);
      expect(mockDb.execSync).toHaveBeenCalledWith('COMMIT;');
    });
  });

  describe('getStopById', () => {
    it('should return stop when found', async () => {
      const mockRow = {
        id: 'stop1',
        name: 'Châtelet',
        lat: 48.8584,
        lon: 2.3470,
        location_type: 0,
        parent_station: null,
      };
      mockDb.getFirstSync.mockReturnValue(mockRow);

      const result = await getStopById('stop1');

      expect(result).toEqual({
        id: 'stop1',
        name: 'Châtelet',
        lat: 48.8584,
        lon: 2.3470,
        locationType: 0,
        parentStation: null,
      });
    });

    it('should return null when not found', async () => {
      mockDb.getFirstSync.mockReturnValue(null);

      const result = await getStopById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('getAllStops', () => {
    it('should return all stops', async () => {
      const mockRows = [
        {
          id: 'stop1',
          name: 'Châtelet',
          lat: 48.8584,
          lon: 2.3470,
          location_type: 0,
          parent_station: null,
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await getAllStops();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('stop1');
    });

    it('should return empty array when no stops', async () => {
      mockDb.getAllSync.mockReturnValue([]);

      const result = await getAllStops();

      expect(result).toEqual([]);
    });
  });

  describe('getAllRoutes', () => {
    it('should return all routes', async () => {
      const mockRows = [
        {
          id: 'route1',
          short_name: '4',
          long_name: 'Métro 4',
          type: 1,
          color: 'BC4C9E',
          text_color: 'FFFFFF',
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await getAllRoutes();

      expect(result).toHaveLength(1);
      expect(result[0].shortName).toBe('4');
    });
  });

  describe('searchStops', () => {
    it('should search stops case-insensitively', async () => {
      const mockRows = [
        {
          id: 'stop1',
          name: 'Châtelet',
          lat: 48.8584,
          lon: 2.3470,
          location_type: 0,
          parent_station: null,
        },
        {
          id: 'stop2',
          name: 'Gare de Lyon',
          lat: 48.8443,
          lon: 2.3730,
          location_type: 0,
          parent_station: null,
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await searchStops('chatelet');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Châtelet');
    });

    it('should handle accent-insensitive search', async () => {
      const mockRows = [
        {
          id: 'stop1',
          name: 'Châtelet',
          lat: 48.8584,
          lon: 2.3470,
          location_type: 0,
          parent_station: null,
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await searchStops('chatelet'); // Without accent

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Châtelet');
    });

    it('should limit results to 50', async () => {
      const mockRows = Array.from({ length: 100 }, (_, i) => ({
        id: `stop${i}`,
        name: `Station ${i}`,
        lat: 48.8584,
        lon: 2.3470,
        location_type: 0,
        parent_station: null,
      }));
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await searchStops('station');

      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('searchRoutes', () => {
    it('should search routes by short name', async () => {
      const mockRows = [
        {
          id: 'route1',
          short_name: '4',
          long_name: 'Métro 4',
          type: 1,
          color: 'BC4C9E',
          text_color: 'FFFFFF',
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await searchRoutes('4');

      expect(result).toHaveLength(1);
      expect(result[0].shortName).toBe('4');
    });

    it('should search routes by long name', async () => {
      const mockRows = [
        {
          id: 'route1',
          short_name: '4',
          long_name: 'Métro 4',
          type: 1,
          color: 'BC4C9E',
          text_color: 'FFFFFF',
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await searchRoutes('metro');

      expect(result).toHaveLength(1);
    });
  });

  describe('getStopsInBounds', () => {
    it('should return stops within geographic bounds', async () => {
      const mockRows = [
        {
          id: 'stop1',
          name: 'Châtelet',
          lat: 48.8584,
          lon: 2.3470,
          location_type: 0,
          parent_station: null,
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await getStopsInBounds(48.85, 2.34, 48.86, 2.35);

      expect(result).toHaveLength(1);
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('BETWEEN'),
        [48.85, 48.86, 2.34, 2.35]
      );
    });
  });

  describe('getRoutesByStopId', () => {
    it('should return routes serving a stop', async () => {
      const mockRouteRows = [
        {
          id: 'route1',
          short_name: '4',
          long_name: 'Métro 4',
          type: 1,
          color: 'BC4C9E',
          text_color: 'FFFFFF',
        },
      ];

      // getRoutesByStopId first calls getFirstSync to find the stop
      mockDb.getFirstSync.mockReturnValueOnce({
        name: 'Châtelet',
        lat: 48.8584,
        lon: 2.3470,
      });

      // Then getAllSync is called twice:
      // 1. Find same-station stops (returns stop IDs)
      // 2. Find routes via JOIN
      mockDb.getAllSync
        .mockReturnValueOnce([{ id: 'stop1' }])   // same-station stops
        .mockReturnValueOnce(mockRouteRows);        // route rows

      const result = await getRoutesByStopId('stop1');

      expect(result).toHaveLength(1);
      expect(result[0].shortName).toBe('4');
    });
  });

  describe('getStopsByRouteId', () => {
    it('should return stops served by a route', async () => {
      const mockRows = [
        {
          id: 'stop1',
          name: 'Châtelet',
          lat: 48.8584,
          lon: 2.3470,
          location_type: 0,
          parent_station: null,
        },
      ];
      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await getStopsByRouteId('route1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Châtelet');
    });
  });
});
