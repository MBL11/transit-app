/**
 * Favorites Storage Module
 * Manages persistent favorites using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Favorite, FavoriteType, FavoriteStop, FavoriteRoute, FavoriteJourney } from './types/favorites';
import type { Stop, Route } from './types/models';

const STORAGE_KEY = '@favorites';

/**
 * Get all favorites from storage
 */
export async function getFavorites(): Promise<Favorite[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as Favorite[];
  } catch (error) {
    console.error('[Favorites] Error loading favorites:', error);
    return [];
  }
}

/**
 * Save favorites to storage
 */
async function saveFavorites(favorites: Favorite[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('[Favorites] Error saving favorites:', error);
    throw error;
  }
}

/**
 * Add a stop to favorites
 */
export async function addFavoriteStop(stop: Stop): Promise<void> {
  const favorites = await getFavorites();

  // Check if already exists
  const exists = favorites.some(f => f.type === 'stop' && f.id === stop.id);
  if (exists) {
    console.log('[Favorites] Stop already in favorites:', stop.id);
    return;
  }

  const favorite: FavoriteStop = {
    type: 'stop',
    id: stop.id,
    data: stop,
    addedAt: Date.now(),
  };

  favorites.push(favorite);
  await saveFavorites(favorites);
  console.log('[Favorites] Added stop to favorites:', stop.id);
}

/**
 * Add a route to favorites
 */
export async function addFavoriteRoute(route: Route): Promise<void> {
  const favorites = await getFavorites();

  // Check if already exists
  const exists = favorites.some(f => f.type === 'route' && f.id === route.id);
  if (exists) {
    console.log('[Favorites] Route already in favorites:', route.id);
    return;
  }

  const favorite: FavoriteRoute = {
    type: 'route',
    id: route.id,
    data: route,
    addedAt: Date.now(),
  };

  favorites.push(favorite);
  await saveFavorites(favorites);
  console.log('[Favorites] Added route to favorites:', route.id);
}

/**
 * Add a journey to favorites
 */
export async function addFavoriteJourney(
  fromStop: Stop,
  toStop: Stop
): Promise<void> {
  const favorites = await getFavorites();

  const id = `${fromStop.id}-${toStop.id}`;

  // Check if already exists
  const exists = favorites.some(f => f.type === 'journey' && f.id === id);
  if (exists) {
    console.log('[Favorites] Journey already in favorites:', id);
    return;
  }

  const favorite: FavoriteJourney = {
    type: 'journey',
    id,
    data: {
      fromStopId: fromStop.id,
      fromStopName: fromStop.name,
      toStopId: toStop.id,
      toStopName: toStop.name,
    },
    addedAt: Date.now(),
  };

  favorites.push(favorite);
  await saveFavorites(favorites);
  console.log('[Favorites] Added journey to favorites:', id);
}

/**
 * Remove a favorite by id and type
 */
export async function removeFavorite(id: string, type: FavoriteType): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter(f => !(f.id === id && f.type === type));

  if (filtered.length === favorites.length) {
    console.log('[Favorites] Favorite not found:', id, type);
    return;
  }

  await saveFavorites(filtered);
  console.log('[Favorites] Removed favorite:', id, type);
}

/**
 * Check if an item is in favorites
 */
export async function isFavorite(id: string, type: FavoriteType): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(f => f.id === id && f.type === type);
}

/**
 * Get favorites by type
 */
export async function getFavoritesByType<T extends FavoriteType>(
  type: T
): Promise<Extract<Favorite, { type: T }>[]> {
  const favorites = await getFavorites();
  return favorites.filter(f => f.type === type) as Extract<Favorite, { type: T }>[];
}

/**
 * Clear all favorites (for testing/reset)
 */
export async function clearAllFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[Favorites] Cleared all favorites');
  } catch (error) {
    console.error('[Favorites] Error clearing favorites:', error);
    throw error;
  }
}

/**
 * Get favorite stops
 */
export async function getFavoriteStops(): Promise<Stop[]> {
  const stops = await getFavoritesByType('stop');
  return stops.map(f => f.data);
}

/**
 * Get favorite routes
 */
export async function getFavoriteRoutes(): Promise<Route[]> {
  const routes = await getFavoritesByType('route');
  return routes.map(f => f.data);
}

/**
 * Get favorite journeys
 */
export async function getFavoriteJourneys(): Promise<FavoriteJourney[]> {
  return getFavoritesByType('journey');
}
