import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFavorites,
  addFavoriteStop,
  addFavoriteRoute,
  addFavoriteJourney,
  removeFavorite,
  isFavorite,
  getFavoritesByType,
  clearAllFavorites,
  getFavoriteStops,
  getFavoriteRoutes,
  getFavoriteJourneys,
} from '../favorites';
import { Stop, Route } from '../types/models';
import { FavoriteStop, FavoriteRoute, FavoriteJourney } from '../types/favorites';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('favorites.ts', () => {
  const mockStop: Stop = {
    id: 'stop1',
    name: 'Châtelet',
    lat: 48.8584,
    lon: 2.3470,
    locationType: 0,
  };

  const mockRoute: Route = {
    id: 'route1',
    shortName: '4',
    longName: 'Métro 4',
    type: 1,
    color: 'BC4C9E',
    textColor: 'FFFFFF',
  };

  const mockStop2: Stop = {
    id: 'stop2',
    name: 'Gare du Nord',
    lat: 48.8809,
    lon: 2.3553,
    locationType: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getFavorites', () => {
    it('should return empty array when no favorites exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getFavorites();

      expect(result).toEqual([]);
    });

    it('should return parsed favorites from storage', async () => {
      const mockFavorites: FavoriteStop[] = [
        {
          type: 'stop',
          id: 'stop1',
          data: mockStop,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockFavorites)
      );

      const result = await getFavorites();

      expect(result).toEqual(mockFavorites);
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await getFavorites();

      expect(result).toEqual([]);
    });
  });

  describe('addFavoriteStop', () => {
    it('should add a new stop to favorites', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      await addFavoriteStop(mockStop);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@favorites',
        expect.stringContaining(mockStop.id)
      );

      // Verify the structure
      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(call[1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].type).toBe('stop');
      expect(savedData[0].id).toBe(mockStop.id);
      expect(savedData[0].data).toEqual(mockStop);
    });

    it('should not add duplicate stops', async () => {
      const existingFavorite: FavoriteStop = {
        type: 'stop',
        id: mockStop.id,
        data: mockStop,
        addedAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([existingFavorite])
      );

      await addFavoriteStop(mockStop);

      // Should not call setItem since it already exists
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should add timestamp to favorite', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      const beforeTime = Date.now();
      await addFavoriteStop(mockStop);
      const afterTime = Date.now();

      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(call[1]);

      expect(savedData[0].addedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(savedData[0].addedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('addFavoriteRoute', () => {
    it('should add a new route to favorites', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      await addFavoriteRoute(mockRoute);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@favorites',
        expect.stringContaining(mockRoute.id)
      );

      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(call[1]);
      expect(savedData[0].type).toBe('route');
      expect(savedData[0].id).toBe(mockRoute.id);
    });

    it('should not add duplicate routes', async () => {
      const existingFavorite: FavoriteRoute = {
        type: 'route',
        id: mockRoute.id,
        data: mockRoute,
        addedAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([existingFavorite])
      );

      await addFavoriteRoute(mockRoute);

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('addFavoriteJourney', () => {
    it('should add a new journey to favorites', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      await addFavoriteJourney(mockStop, mockStop2);

      expect(AsyncStorage.setItem).toHaveBeenCalled();

      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(call[1]);
      expect(savedData[0].type).toBe('journey');
      expect(savedData[0].id).toBe(`${mockStop.id}-${mockStop2.id}`);
      expect(savedData[0].data.fromStopId).toBe(mockStop.id);
      expect(savedData[0].data.toStopId).toBe(mockStop2.id);
    });

    it('should not add duplicate journeys', async () => {
      const existingFavorite: FavoriteJourney = {
        type: 'journey',
        id: `${mockStop.id}-${mockStop2.id}`,
        data: {
          fromStopId: mockStop.id,
          fromStopName: mockStop.name,
          toStopId: mockStop2.id,
          toStopName: mockStop2.name,
        },
        addedAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([existingFavorite])
      );

      await addFavoriteJourney(mockStop, mockStop2);

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite by id and type', async () => {
      const favorites = [
        {
          type: 'stop',
          id: mockStop.id,
          data: mockStop,
          addedAt: Date.now(),
        },
        {
          type: 'route',
          id: mockRoute.id,
          data: mockRoute,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      await removeFavorite(mockStop.id, 'stop');

      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(call[1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].type).toBe('route');
    });

    it('should do nothing if favorite not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      await removeFavorite('nonexistent', 'stop');

      // Should still call setItem with empty array
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should only remove matching type', async () => {
      // Create a scenario where same ID exists for different types
      const favorites = [
        {
          type: 'stop',
          id: 'same-id',
          data: mockStop,
          addedAt: Date.now(),
        },
        {
          type: 'route',
          id: 'same-id',
          data: mockRoute,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      await removeFavorite('same-id', 'stop');

      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(call[1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].type).toBe('route');
    });
  });

  describe('isFavorite', () => {
    it('should return true if item is in favorites', async () => {
      const favorites = [
        {
          type: 'stop',
          id: mockStop.id,
          data: mockStop,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      const result = await isFavorite(mockStop.id, 'stop');

      expect(result).toBe(true);
    });

    it('should return false if item is not in favorites', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      const result = await isFavorite(mockStop.id, 'stop');

      expect(result).toBe(false);
    });

    it('should check both id and type', async () => {
      const favorites = [
        {
          type: 'stop',
          id: 'same-id',
          data: mockStop,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      const resultStop = await isFavorite('same-id', 'stop');
      const resultRoute = await isFavorite('same-id', 'route');

      expect(resultStop).toBe(true);
      expect(resultRoute).toBe(false);
    });
  });

  describe('getFavoritesByType', () => {
    it('should return only favorites of specified type', async () => {
      const favorites = [
        {
          type: 'stop',
          id: mockStop.id,
          data: mockStop,
          addedAt: Date.now(),
        },
        {
          type: 'route',
          id: mockRoute.id,
          data: mockRoute,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      const stopFavorites = await getFavoritesByType('stop');
      const routeFavorites = await getFavoritesByType('route');

      expect(stopFavorites).toHaveLength(1);
      expect(stopFavorites[0].type).toBe('stop');

      expect(routeFavorites).toHaveLength(1);
      expect(routeFavorites[0].type).toBe('route');
    });
  });

  describe('clearAllFavorites', () => {
    it('should remove all favorites from storage', async () => {
      await clearAllFavorites();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@favorites');
    });

    it('should handle errors', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await expect(clearAllFavorites()).rejects.toThrow('Storage error');
    });
  });

  describe('getFavoriteStops', () => {
    it('should return stop data from favorites', async () => {
      const favorites = [
        {
          type: 'stop',
          id: mockStop.id,
          data: mockStop,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      const result = await getFavoriteStops();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockStop);
    });
  });

  describe('getFavoriteRoutes', () => {
    it('should return route data from favorites', async () => {
      const favorites = [
        {
          type: 'route',
          id: mockRoute.id,
          data: mockRoute,
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      const result = await getFavoriteRoutes();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockRoute);
    });
  });

  describe('getFavoriteJourneys', () => {
    it('should return journey favorites', async () => {
      const favorites = [
        {
          type: 'journey',
          id: `${mockStop.id}-${mockStop2.id}`,
          data: {
            fromStopId: mockStop.id,
            fromStopName: mockStop.name,
            toStopId: mockStop2.id,
            toStopName: mockStop2.name,
          },
          addedAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(favorites)
      );

      const result = await getFavoriteJourneys();

      expect(result).toHaveLength(1);
      expect(result[0].data.fromStopId).toBe(mockStop.id);
      expect(result[0].data.toStopId).toBe(mockStop2.id);
    });
  });
});
