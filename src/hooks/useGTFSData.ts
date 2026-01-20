/**
 * GTFS Data Hook
 * Manages GTFS data loading state
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isGTFSDataAvailable } from '../core/gtfs-downloader';

const GTFS_LOADED_KEY = '@gtfs_loaded';
const GTFS_LAST_UPDATE_KEY = '@gtfs_last_update';
const GTFS_SOURCE_KEY = '@gtfs_source';

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
      setIsLoaded(dataExists);

      if (dataExists) {
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
