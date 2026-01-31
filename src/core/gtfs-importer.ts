/**
 * GTFS Importer
 * Imports GTFS data into SQLite database
 */

import { parseGTFSFeed, validateGTFSData } from './gtfs-parser';
import * as db from './database';
import { logger } from '../utils/logger';

/**
 * Import GTFS data into database
 * Takes raw CSV content and imports it into SQLite
 */
export async function importGTFSToDatabase(feedData: {
  stops: string;
  routes: string;
  trips: string;
  stopTimes: string;
  shapes?: string;
}): Promise<void> {
  logger.log('[GTFSImporter] Starting GTFS import...');

  try {
    // Step 1: Parse and normalize GTFS data
    logger.log('[GTFSImporter] Step 1/4: Parsing GTFS files...');
    const data = parseGTFSFeed(feedData);

    // Step 2: Validate data
    logger.log('[GTFSImporter] Step 2/4: Validating data...');
    const { isValid, errors, warnings } = validateGTFSData(data);

    if (!isValid) {
      logger.error('[GTFSImporter] ❌ Validation failed:', errors);
      throw new Error(`GTFS validation failed: ${errors.join(', ')}`);
    }
    if (warnings && warnings.length > 0) {
      logger.warn('[GTFSImporter] ⚠️ Validation warnings:', warnings);
    }

    // Step 3: Initialize database
    logger.log('[GTFSImporter] Step 3/4: Initializing database...');
    await db.initializeDatabase();

    // Step 4: Insert data into database
    logger.log('[GTFSImporter] Step 4/4: Inserting data...');

    // Insert in order (respecting foreign keys)
    await db.insertRoutes(data.routes);
    await db.insertStops(data.stops);
    await db.insertTrips(data.trips);
    await db.insertStopTimes(data.stopTimes);

    // Get final stats
    const stats = db.getDatabaseStats();
    logger.log('[GTFSImporter] ✅ Import complete!');
    logger.log('[GTFSImporter] Database stats:', stats);
  } catch (error) {
    logger.error('[GTFSImporter] ❌ Import failed:', error);
    throw error;
  }
}

/**
 * Import GTFS from URLs
 */
export async function importGTFSFromURLs(urls: {
  stops: string;
  routes: string;
  trips: string;
  stopTimes: string;
  shapes?: string;
}): Promise<void> {
  logger.log('[GTFSImporter] Downloading GTFS files from URLs...');

  try {
    const [stopsText, routesText, tripsText, stopTimesText] = await Promise.all([
      fetch(urls.stops).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch stops: ${r.statusText}`);
        return r.text();
      }),
      fetch(urls.routes).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch routes: ${r.statusText}`);
        return r.text();
      }),
      fetch(urls.trips).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch trips: ${r.statusText}`);
        return r.text();
      }),
      fetch(urls.stopTimes).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch stop_times: ${r.statusText}`);
        return r.text();
      }),
    ]);

    logger.log('[GTFSImporter] ✅ All files downloaded');

    await importGTFSToDatabase({
      stops: stopsText,
      routes: routesText,
      trips: tripsText,
      stopTimes: stopTimesText,
    });
  } catch (error) {
    logger.error('[GTFSImporter] ❌ Failed to import from URLs:', error);
    throw error;
  }
}

/**
 * Clear all GTFS data from database
 */
export async function clearGTFSData(): Promise<void> {
  logger.log('[GTFSImporter] Clearing GTFS data...');

  try {
    await db.dropAllTables();
    await db.initializeDatabase();
    logger.log('[GTFSImporter] ✅ Database cleared');
  } catch (error) {
    logger.error('[GTFSImporter] ❌ Failed to clear data:', error);
    throw error;
  }
}

/**
 * Get import status
 */
export function getImportStatus(): {
  hasData: boolean;
  stats: {
    stops: number;
    routes: number;
    trips: number;
    stopTimes: number;
  };
} {
  const isEmpty = db.isDatabaseEmpty();
  const stats = db.getDatabaseStats();

  return {
    hasData: !isEmpty,
    stats,
  };
}
