/**
 * GTFS Data Hook
 * Manages GTFS data loading state
 */

import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isGTFSDataAvailable, downloadAndImportAllIzmir, importEshotOnly } from '../core/gtfs-downloader';
import * as db from '../core/database';
import { logger } from '../utils/logger';

const GTFS_LOADED_KEY = '@gtfs_loaded';
const GTFS_LAST_UPDATE_KEY = '@gtfs_last_update';
const GTFS_SOURCE_KEY = '@gtfs_source';

// İzmir bounding box
const IZMIR_BOUNDS = {
  minLat: 38.2,
  maxLat: 38.7,
  minLon: 26.6,
  maxLon: 27.4,
};

/**
 * Check if data is from İzmir by sampling stops
 */
async function isIzmirData(): Promise<boolean> {
  try {
    const stops = await db.getAllStops();
    if (stops.length === 0) return false;

    // Check if at least some stops are within İzmir bounds
    const izmirStops = stops.filter(
      (s) =>
        s.lat >= IZMIR_BOUNDS.minLat &&
        s.lat <= IZMIR_BOUNDS.maxLat &&
        s.lon >= IZMIR_BOUNDS.minLon &&
        s.lon <= IZMIR_BOUNDS.maxLon
    );

    // If less than 10% of stops are in İzmir, it's probably Paris data
    return izmirStops.length / stops.length > 0.1;
  } catch {
    return false;
  }
}

export function useGTFSData() {
  const [isLoaded, setIsLoaded] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [stopCounts, setStopCounts] = useState<Record<string, number> | null>(null);
  const refreshInProgress = useRef(false);

  useEffect(() => {
    checkData();
  }, []);

  const countStopsByType = async () => {
    try {
      const stops = await db.getAllStops();
      const counts: Record<string, number> = {
        rail: 0,    // İZBAN
        ferry: 0,   // İzdeniz
        metro: 0,   // Metro
        tram: 0,    // Tramway
        bus: 0,     // ESHOT
        other: 0,
      };
      for (const stop of stops) {
        if (stop.id.startsWith('rail_')) counts.rail++;
        else if (stop.id.startsWith('ferry_')) counts.ferry++;
        else if (stop.id.startsWith('metro_')) counts.metro++;
        else if (stop.id.startsWith('tram_')) counts.tram++;
        else if (stop.id.startsWith('bus_')) counts.bus++;
        else counts.other++;
      }
      counts.total = stops.length;

      // Check İZBAN calendar status
      const activeServices = db.getActiveServiceIds(new Date());
      if (activeServices) {
        const railServices = Array.from(activeServices).filter(s => s.startsWith('rail_'));
        counts.railServicesActive = railServices.length;
      } else {
        counts.railServicesActive = -1; // No calendar data
      }

      // Check if İZBAN stop_times exist (routes linked to stops)
      const database = db.openDatabase();
      const railStopTimesCheck = database.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM stop_times WHERE stop_id LIKE 'rail_%'`
      );
      counts.railStopTimes = railStopTimesCheck?.count || 0;

      return counts;
    } catch {
      return null;
    }
  };

  const checkData = async () => {
    setChecking(true);

    try {
      // Check if data exists in database
      const dataExists = await isGTFSDataAvailable();

      if (dataExists) {
        // Check if data is from İzmir (not Paris)
        const isIzmir = await isIzmirData();

        if (!isIzmir) {
          logger.log('[useGTFSData] Non-İzmir data detected, clearing...');
          db.clearAllData();
          await AsyncStorage.removeItem(GTFS_LOADED_KEY);
          await AsyncStorage.removeItem(GTFS_LAST_UPDATE_KEY);
          await AsyncStorage.removeItem(GTFS_SOURCE_KEY);
          setIsLoaded(false);
          setLastUpdate(null);
          setSource(null);
          logger.log('[useGTFSData] ✅ Old data cleared, ready for İzmir import');
        } else {
          // Auto-fix: ensure calendar entries exist for manual services (T1, T2, T3, M1, ESHOT)
          // This runs silently and fixes missing calendars without requiring user to reload data
          await db.ensureManualServiceCalendars();

          // Count stops by type for diagnostics
          const counts = await countStopsByType();
          setStopCounts(counts);
          if (counts) {
            logger.log('[useGTFSData] Stop counts:', counts);
          }

          // Check if buses are missing - if so, import ESHOT data
          if (counts && counts.bus === 0) {
            logger.log('[useGTFSData] ⚠️ No bus data found, importing ESHOT...');
            try {
              const result = await importEshotOnly((stage, progress) => {
                logger.log(`[useGTFSData] ESHOT import: ${stage} ${Math.round(progress * 100)}%`);
              });
              logger.log('[useGTFSData] ✅ ESHOT import complete:', result);

              // Recount after import
              const newCounts = await countStopsByType();
              setStopCounts(newCounts);
              if (newCounts) {
                logger.log('[useGTFSData] Updated stop counts:', newCounts);
              }
            } catch (eshotError) {
              logger.warn('[useGTFSData] ESHOT import failed:', eshotError);
            }
          }

          setIsLoaded(true);
          // Get metadata from AsyncStorage
          const updateStr = await AsyncStorage.getItem(GTFS_LAST_UPDATE_KEY);
          const sourceStr = await AsyncStorage.getItem(GTFS_SOURCE_KEY);

          if (updateStr) {
            setLastUpdate(new Date(updateStr));
          }
          if (sourceStr) {
            setSource(sourceStr);
          }
        }
      } else {
        setIsLoaded(false);
      }
    } catch (error) {
      logger.error('[useGTFSData] Error checking data:', error);
      setIsLoaded(false);
    } finally {
      setChecking(false);
    }
  };

  const markAsLoaded = async (sourceName: string) => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(GTFS_LOADED_KEY, 'true');
    await AsyncStorage.setItem(GTFS_LAST_UPDATE_KEY, now);
    await AsyncStorage.setItem(GTFS_SOURCE_KEY, sourceName);

    setIsLoaded(true);
    setLastUpdate(new Date(now));
    setSource(sourceName);
  };

  const needsUpdate = (): boolean => {
    if (!lastUpdate) return true;
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 7; // Update if > 7 days old
  };

  /**
   * Trigger a background refresh of GTFS data
   * This runs silently and updates the data without blocking the user
   */
  const triggerBackgroundRefresh = async (): Promise<void> => {
    // Prevent multiple simultaneous refreshes
    if (refreshInProgress.current) {
      logger.log('[useGTFSData] Background refresh already in progress, skipping');
      return;
    }

    refreshInProgress.current = true;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      logger.log('[useGTFSData] Starting background GTFS refresh...');

      const result = await downloadAndImportAllIzmir((stage, progress, sourceName) => {
        // Silent progress - just log it
        logger.log(`[useGTFSData] Background refresh: ${stage} ${Math.round(progress * 100)}% ${sourceName || ''}`);
      });

      // Update metadata
      const now = new Date().toISOString();
      await AsyncStorage.setItem(GTFS_LOADED_KEY, 'true');
      await AsyncStorage.setItem(GTFS_LAST_UPDATE_KEY, now);
      await AsyncStorage.setItem(GTFS_SOURCE_KEY, 'İzmir');

      setLastUpdate(new Date(now));
      setSource('İzmir');
      setIsLoaded(true);

      logger.log('[useGTFSData] ✅ Background refresh complete:', {
        stops: result.stops,
        routes: result.routes,
        trips: result.trips,
        stopTimes: result.stopTimes,
      });
    } catch (error) {
      logger.error('[useGTFSData] Background refresh failed:', error);
      setRefreshError(error instanceof Error ? error.message : 'Unknown error');
      // Don't throw - we want the app to continue working with old data
    } finally {
      refreshInProgress.current = false;
      setIsRefreshing(false);
    }
  };

  /**
   * Force a complete reload of all GTFS data
   * Clears existing data and re-imports everything
   */
  const forceReloadAllData = async (): Promise<void> => {
    if (refreshInProgress.current) {
      logger.log('[useGTFSData] Refresh already in progress, skipping');
      return;
    }

    refreshInProgress.current = true;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      logger.log('[useGTFSData] Force reload: clearing all data...');

      // Clear database and AsyncStorage
      db.clearAllData();
      await AsyncStorage.removeItem(GTFS_LOADED_KEY);
      await AsyncStorage.removeItem(GTFS_LAST_UPDATE_KEY);
      await AsyncStorage.removeItem(GTFS_SOURCE_KEY);

      logger.log('[useGTFSData] Force reload: re-importing all data...');

      const result = await downloadAndImportAllIzmir((stage, progress, sourceName) => {
        logger.log(`[useGTFSData] Reload: ${stage} ${Math.round(progress * 100)}% ${sourceName || ''}`);
      });

      // Update metadata
      const now = new Date().toISOString();
      await AsyncStorage.setItem(GTFS_LOADED_KEY, 'true');
      await AsyncStorage.setItem(GTFS_LAST_UPDATE_KEY, now);
      await AsyncStorage.setItem(GTFS_SOURCE_KEY, 'İzmir');

      setLastUpdate(new Date(now));
      setSource('İzmir');
      setIsLoaded(true);

      // Update stop counts
      const counts = await countStopsByType();
      setStopCounts(counts);

      logger.log('[useGTFSData] ✅ Force reload complete:', result);
    } catch (error) {
      logger.error('[useGTFSData] Force reload failed:', error);
      setRefreshError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      refreshInProgress.current = false;
      setIsRefreshing(false);
    }
  };

  return {
    isLoaded,
    lastUpdate,
    source,
    checking,
    markAsLoaded,
    needsUpdate,
    refresh: checkData,
    // Background refresh
    isRefreshing,
    refreshError,
    triggerBackgroundRefresh,
    // Force reload
    forceReloadAllData,
    // Diagnostics
    stopCounts,
  };
}
