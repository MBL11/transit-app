/**
 * GTFS Data Hook
 * Manages GTFS data loading state
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isGTFSDataAvailable } from '../core/gtfs-downloader';
import * as db from '../core/database';

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

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    setChecking(true);

    try {
      // Check if data exists in database
      const dataExists = await isGTFSDataAvailable();

      if (dataExists) {
        // Check if data is from İzmir (not Paris)
        const isIzmir = await isIzmirData();

        if (!isIzmir) {
          console.log('[useGTFSData] Non-İzmir data detected, clearing...');
          db.clearAllData();
          await AsyncStorage.removeItem(GTFS_LOADED_KEY);
          await AsyncStorage.removeItem(GTFS_LAST_UPDATE_KEY);
          await AsyncStorage.removeItem(GTFS_SOURCE_KEY);
          setIsLoaded(false);
          setLastUpdate(null);
          setSource(null);
          console.log('[useGTFSData] ✅ Old data cleared, ready for İzmir import');
        } else {
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
      console.error('[useGTFSData] Error checking data:', error);
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

  return {
    isLoaded,
    lastUpdate,
    source,
    checking,
    markAsLoaded,
    needsUpdate,
    refresh: checkData,
  };
}
