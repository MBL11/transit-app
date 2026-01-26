/**
 * Test Data Loader
 * Loads realistic Paris metro test data into the database
 */

import {
  initializeDatabase,
  clearAllData,
  insertStops,
  insertRoutes,
  insertTrips,
  insertStopTimes,
  getDatabaseStats,
} from './database';
import { getParisMetroTestData } from './paris-metro-test-data';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GTFS_LOADED_KEY = '@gtfs_loaded';
const GTFS_SOURCE_KEY = '@gtfs_source';
const GTFS_DATE_KEY = '@gtfs_date';

export type LoadingStage = 'initializing' | 'clearing' | 'stops' | 'routes' | 'trips' | 'stopTimes' | 'complete';

export interface LoadingProgress {
  stage: LoadingStage;
  progress: number; // 0-1
  message: string;
}

/**
 * Load Paris metro test data into the database
 * @param onProgress - Callback for progress updates
 */
export async function loadTestData(
  onProgress?: (progress: LoadingProgress) => void
): Promise<{ stops: number; routes: number; trips: number; stopTimes: number }> {
  const updateProgress = (stage: LoadingStage, progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
    console.log(`[TestDataLoader] ${message} (${Math.round(progress * 100)}%)`);
  };

  try {
    // Initialize database
    updateProgress('initializing', 0.05, 'Initialisation de la base de données...');
    await initializeDatabase();

    // Clear existing data
    updateProgress('clearing', 0.1, 'Suppression des anciennes données...');
    clearAllData();

    // Get test data
    const testData = getParisMetroTestData();

    // Insert stops
    updateProgress('stops', 0.2, `Chargement de ${testData.stops.length} arrêts...`);
    await insertStops(testData.stops);

    // Insert routes
    updateProgress('routes', 0.4, `Chargement de ${testData.routes.length} lignes...`);
    await insertRoutes(testData.routes);

    // Insert trips
    updateProgress('trips', 0.6, `Chargement de ${testData.trips.length} trajets...`);
    await insertTrips(testData.trips);

    // Insert stop times
    updateProgress('stopTimes', 0.8, `Chargement de ${testData.stopTimes.length} horaires...`);
    await insertStopTimes(testData.stopTimes);

    // Mark as loaded
    await AsyncStorage.setItem(GTFS_LOADED_KEY, 'true');
    await AsyncStorage.setItem(GTFS_SOURCE_KEY, 'Paris Metro Test Data');
    await AsyncStorage.setItem(GTFS_DATE_KEY, new Date().toISOString());

    // Get final stats
    const stats = getDatabaseStats();
    updateProgress('complete', 1, 'Données chargées avec succès !');

    console.log('[TestDataLoader] ✅ Test data loaded successfully:', stats);
    return stats;
  } catch (error) {
    console.error('[TestDataLoader] ❌ Failed to load test data:', error);
    throw error;
  }
}

/**
 * Check if test data is already loaded
 */
export async function isTestDataLoaded(): Promise<boolean> {
  const loaded = await AsyncStorage.getItem(GTFS_LOADED_KEY);
  return loaded === 'true';
}

/**
 * Get current data source info
 */
export async function getDataSourceInfo(): Promise<{
  isLoaded: boolean;
  source: string | null;
  loadDate: Date | null;
}> {
  const isLoaded = await isTestDataLoaded();
  const source = await AsyncStorage.getItem(GTFS_SOURCE_KEY);
  const dateStr = await AsyncStorage.getItem(GTFS_DATE_KEY);

  return {
    isLoaded,
    source,
    loadDate: dateStr ? new Date(dateStr) : null,
  };
}

/**
 * Clear all data and reset loaded status
 */
export async function clearTestData(): Promise<void> {
  clearAllData();
  await AsyncStorage.removeItem(GTFS_LOADED_KEY);
  await AsyncStorage.removeItem(GTFS_SOURCE_KEY);
  await AsyncStorage.removeItem(GTFS_DATE_KEY);
  console.log('[TestDataLoader] ✅ Test data cleared');
}
