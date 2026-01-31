/**
 * useFavorites Hook
 * Manages favorites state and provides functions to add/remove favorites
 */

import { useState, useEffect, useCallback } from 'react';
import type { Favorite, FavoriteType } from '../core/types/favorites';
import type { Stop, Route } from '../core/types/models';
import * as favoritesStorage from '../core/favorites';
import { logger } from '../utils/logger';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const data = await favoritesStorage.getFavorites();
      setFavorites(data);
    } catch (error) {
      logger.error('[useFavorites] Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(async () => {
    await loadFavorites();
  }, []);

  const addStop = useCallback(async (stop: Stop) => {
    try {
      await favoritesStorage.addFavoriteStop(stop);
      await loadFavorites();
    } catch (error) {
      logger.error('[useFavorites] Error adding stop:', error);
      throw error;
    }
  }, []);

  const addRoute = useCallback(async (route: Route) => {
    try {
      await favoritesStorage.addFavoriteRoute(route);
      await loadFavorites();
    } catch (error) {
      logger.error('[useFavorites] Error adding route:', error);
      throw error;
    }
  }, []);

  const addJourney = useCallback(async (fromStop: Stop, toStop: Stop) => {
    try {
      await favoritesStorage.addFavoriteJourney(fromStop, toStop);
      await loadFavorites();
    } catch (error) {
      logger.error('[useFavorites] Error adding journey:', error);
      throw error;
    }
  }, []);

  const remove = useCallback(async (id: string, type: FavoriteType) => {
    try {
      await favoritesStorage.removeFavorite(id, type);
      await loadFavorites();
    } catch (error) {
      logger.error('[useFavorites] Error removing favorite:', error);
      throw error;
    }
  }, []);

  const isFavorite = useCallback(
    (id: string, type: FavoriteType): boolean => {
      return favorites.some(f => f.id === id && f.type === type);
    },
    [favorites]
  );

  const toggleStop = useCallback(
    async (stop: Stop) => {
      if (isFavorite(stop.id, 'stop')) {
        await remove(stop.id, 'stop');
      } else {
        await addStop(stop);
      }
    },
    [isFavorite, remove, addStop]
  );

  const toggleRoute = useCallback(
    async (route: Route) => {
      if (isFavorite(route.id, 'route')) {
        await remove(route.id, 'route');
      } else {
        await addRoute(route);
      }
    },
    [isFavorite, remove, addRoute]
  );

  const toggleJourney = useCallback(
    async (fromStop: Stop, toStop: Stop) => {
      const id = `${fromStop.id}-${toStop.id}`;
      if (isFavorite(id, 'journey')) {
        await remove(id, 'journey');
      } else {
        await addJourney(fromStop, toStop);
      }
    },
    [isFavorite, remove, addJourney]
  );

  // Get favorites by type
  const stops = favorites.filter(f => f.type === 'stop');
  const routes = favorites.filter(f => f.type === 'route');
  const journeys = favorites.filter(f => f.type === 'journey');

  return {
    favorites,
    stops,
    routes,
    journeys,
    loading,
    refresh,
    addStop,
    addRoute,
    addJourney,
    remove,
    isFavorite,
    toggleStop,
    toggleRoute,
    toggleJourney,
  };
}
