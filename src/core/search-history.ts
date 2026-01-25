/**
 * Search History Service
 * Stores recent address searches for quick access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeocodingResult } from './geocoding';

const HISTORY_KEY = '@address_search_history';
const MAX_HISTORY_ITEMS = 5;

export interface SearchHistoryItem extends GeocodingResult {
  timestamp: number;
}

/**
 * Get recent address searches
 */
export async function getRecentSearches(): Promise<SearchHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (!data) return [];

    const history: SearchHistoryItem[] = JSON.parse(data);
    // Sort by timestamp descending (most recent first)
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[SearchHistory] Error loading history:', error);
    return [];
  }
}

/**
 * Add an address to search history
 */
export async function addToHistory(result: GeocodingResult): Promise<void> {
  try {
    // Don't save current location
    if (result.type === 'current_location') return;

    const history = await getRecentSearches();

    // Check if this address already exists (by coordinates)
    const existingIndex = history.findIndex(
      item => Math.abs(item.lat - result.lat) < 0.0001 && Math.abs(item.lon - result.lon) < 0.0001
    );

    // Remove existing if found
    if (existingIndex >= 0) {
      history.splice(existingIndex, 1);
    }

    // Add new item at the beginning
    const newItem: SearchHistoryItem = {
      ...result,
      timestamp: Date.now(),
    };
    history.unshift(newItem);

    // Keep only MAX_HISTORY_ITEMS
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    console.log('[SearchHistory] Added to history:', result.shortAddress || result.displayName);
  } catch (error) {
    console.error('[SearchHistory] Error saving to history:', error);
  }
}

/**
 * Clear search history
 */
export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    console.log('[SearchHistory] History cleared');
  } catch (error) {
    console.error('[SearchHistory] Error clearing history:', error);
  }
}
