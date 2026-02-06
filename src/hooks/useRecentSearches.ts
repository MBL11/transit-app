/**
 * Hook to manage recent stop searches
 * Stores the last 5 searched stops in AsyncStorage
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Stop } from '../core/types/models';
import { logger } from '../utils/logger';

const RECENT_STOPS_KEY = '@recent_stops';
const MAX_RECENT_STOPS = 5;

export function useRecentSearches() {
  const [recentStops, setRecentStops] = useState<Stop[]>([]);

  // Load recent stops on mount
  useEffect(() => {
    loadRecentStops();
  }, []);

  const loadRecentStops = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_STOPS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentStops(parsed);
        logger.log(`[RecentSearches] Loaded ${parsed.length} recent stops`);
      }
    } catch (error) {
      logger.error('[RecentSearches] Error loading recent stops:', error);
    }
  };

  const addRecentStop = useCallback(async (stop: Stop) => {
    try {
      // Remove if already exists (to move to top)
      const filtered = recentStops.filter(s => s.id !== stop.id);

      // Add to beginning
      const updated = [stop, ...filtered].slice(0, MAX_RECENT_STOPS);

      setRecentStops(updated);
      await AsyncStorage.setItem(RECENT_STOPS_KEY, JSON.stringify(updated));
      logger.log(`[RecentSearches] Added "${stop.name}" to recent stops`);
    } catch (error) {
      logger.error('[RecentSearches] Error saving recent stop:', error);
    }
  }, [recentStops]);

  const clearRecentStops = useCallback(async () => {
    try {
      setRecentStops([]);
      await AsyncStorage.removeItem(RECENT_STOPS_KEY);
      logger.log('[RecentSearches] Cleared recent stops');
    } catch (error) {
      logger.error('[RecentSearches] Error clearing recent stops:', error);
    }
  }, []);

  return {
    recentStops,
    addRecentStop,
    clearRecentStops,
  };
}
