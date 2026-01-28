/**
 * GTFS Downloader
 * Downloads and extracts GTFS data from various cities
 */

import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { parseGTFSFeed, validateGTFSData } from './gtfs-parser';
import * as db from './database';

// Available GTFS sources - İzmir official open data
// Source: https://acikveri.bizizmir.com/en/dataset/toplu-ulasim-gtfs-verileri
export const GTFS_SOURCES = {
  // İzmir Rail & Ferry sources (all working)
  METRO_IZMIR: {
    name: 'Metro İzmir',
    url: 'https://www.izmirmetro.com.tr/gtfs/rail-metro-gtfs.zip',
    size: '130 KB',
    type: 'metro',
  },
  TRAM_IZMIR: {
    name: 'Tramvay İzmir',
    url: 'https://www.tramizmir.com/gtfs/rail-tramizmir-gtfs.zip',
    size: '172 KB',
    type: 'tram',
  },
  IZBAN: {
    name: 'İZBAN (Banliyö Treni)',
    url: 'https://www.izban.com.tr/gtfs/rail-izban-gtfs.zip',
    size: '40 KB',
    type: 'rail',
  },
  IZDENIZ: {
    name: 'İzdeniz (Vapur/Ferry)',
    url: 'https://www.izdeniz.com.tr/gtfs/ship-izdeniz-gtfs.zip',
    size: '32 KB',
    type: 'ferry',
  },
  // ESHOT bus - currently blocked (403), will add when available
  // ESHOT: {
  //   name: 'ESHOT (İzmir Otobüs)',
  //   url: 'https://www.eshot.gov.tr/gtfs/bus-eshot-gtfs.zip',
  //   size: '19 MB',
  //   type: 'bus',
  // },
} as const;

// İzmir sources list for combined download (only working URLs)
export const IZMIR_SOURCES: GTFSSourceKey[] = ['METRO_IZMIR', 'TRAM_IZMIR', 'IZBAN', 'IZDENIZ'];

export type GTFSSourceKey = keyof typeof GTFS_SOURCES;

/**
 * Download GTFS ZIP file from URL
 */
export async function downloadGTFSZip(
  url: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('[GTFSDownloader] Starting download from:', url);

  const fileUri = `${FileSystem.cacheDirectory}gtfs-download.zip`;

  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) {
          onProgress(progress);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error('Download failed: no result');
    }

    console.log('[GTFSDownloader] ✅ Download complete:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('[GTFSDownloader] ❌ Download error:', error);
    throw new Error(`Failed to download GTFS: ${error}`);
  }
}

/**
 * Find a file in ZIP by name (handles subdirectories)
 */
function findFileInZip(zip: JSZip, fileName: string): JSZip.JSZipObject | null {
  // First try exact match at root
  let file = zip.file(fileName);
  if (file) return file;

  // Search in all paths (handles subdirectories like rail-metro-gtfs/stops.txt)
  const allFiles = Object.keys(zip.files);
  const matchingPath = allFiles.find(path => path.endsWith(`/${fileName}`) || path === fileName);

  if (matchingPath) {
    return zip.file(matchingPath);
  }

  return null;
}

/**
 * Extract GTFS files from ZIP
 */
export async function extractGTFSZip(zipUri: string): Promise<{
  stops: string;
  routes: string;
  trips: string;
  stopTimes: string;
  shapes?: string;
}> {
  console.log('[GTFSDownloader] Extracting ZIP file...');

  try {
    // Read ZIP file as base64
    const zipBase64 = await FileSystem.readAsStringAsync(zipUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Load ZIP with jszip
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });

    // Log all files in ZIP for debugging
    const allFiles = Object.keys(zip.files);
    console.log('[GTFSDownloader] ZIP contents:', allFiles.join(', '));

    // Extract required files (handles subdirectories)
    const filesNeeded = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
    const extractedFiles: Record<string, string> = {};

    for (const fileName of filesNeeded) {
      const file = findFileInZip(zip, fileName);
      if (!file) {
        throw new Error(`Missing required file: ${fileName}`);
      }

      const content = await file.async('string');
      extractedFiles[fileName] = content;
      console.log(`[GTFSDownloader] ✅ Extracted ${fileName} (${content.length} bytes)`);
    }

    // Optional: shapes.txt
    const shapesFile = findFileInZip(zip, 'shapes.txt');
    if (shapesFile) {
      extractedFiles['shapes.txt'] = await shapesFile.async('string');
      console.log('[GTFSDownloader] ✅ Extracted shapes.txt (optional)');
    }

    return {
      stops: extractedFiles['stops.txt'],
      routes: extractedFiles['routes.txt'],
      trips: extractedFiles['trips.txt'],
      stopTimes: extractedFiles['stop_times.txt'],
      shapes: extractedFiles['shapes.txt'],
    };
  } catch (error) {
    console.error('[GTFSDownloader] ❌ Extraction error:', error);
    throw new Error(`Failed to extract GTFS: ${error}`);
  }
}

/**
 * Download and import GTFS data into database
 */
export async function downloadAndImportGTFS(
  source: GTFSSourceKey = 'ESHOT',
  onProgress?: (stage: string, progress: number) => void
): Promise<{ stops: number; routes: number; trips: number; stopTimes: number }> {
  console.log(`[GTFSDownloader] Starting GTFS import from ${GTFS_SOURCES[source].name}...`);

  try {
    const gtfsUrl = GTFS_SOURCES[source].url;

    // Step 1: Download ZIP
    onProgress?.('downloading', 0);
    const zipUri = await downloadGTFSZip(gtfsUrl, (progress) => {
      onProgress?.('downloading', progress);
    });

    // Step 2: Extract ZIP
    onProgress?.('extracting', 0);
    const gtfsFiles = await extractGTFSZip(zipUri);
    onProgress?.('extracting', 1);

    // Step 3: Parse GTFS data
    onProgress?.('parsing', 0);
    const parsedData = parseGTFSFeed(gtfsFiles);
    onProgress?.('parsing', 1);

    // Step 4: Validate data
    onProgress?.('validating', 0);
    const validation = validateGTFSData(parsedData);
    if (!validation.isValid) {
      throw new Error(`GTFS validation failed: ${validation.errors.join(', ')}`);
    }
    onProgress?.('validating', 1);

    // Step 5: Clear existing data
    onProgress?.('clearing', 0);
    db.clearAllData();
    onProgress?.('clearing', 1);

    // Step 6: Insert into database
    onProgress?.('importing', 0);

    console.log('[GTFSDownloader] Inserting routes...');
    await db.insertRoutes(parsedData.routes);
    onProgress?.('importing', 0.25);

    console.log('[GTFSDownloader] Inserting stops...');
    await db.insertStops(parsedData.stops);
    onProgress?.('importing', 0.5);

    console.log('[GTFSDownloader] Inserting trips...');
    await db.insertTrips(parsedData.trips);
    onProgress?.('importing', 0.75);

    console.log('[GTFSDownloader] Inserting stop times...');
    // Insert stop times in batches to avoid memory issues
    const batchSize = 10000;
    for (let i = 0; i < parsedData.stopTimes.length; i += batchSize) {
      const batch = parsedData.stopTimes.slice(i, i + batchSize);
      await db.insertStopTimes(batch);
      const progress = 0.75 + (i / parsedData.stopTimes.length) * 0.25;
      onProgress?.('importing', progress);
    }

    onProgress?.('importing', 1);

    // Step 7: Cleanup
    await FileSystem.deleteAsync(zipUri, { idempotent: true });

    const result = {
      stops: parsedData.stops.length,
      routes: parsedData.routes.length,
      trips: parsedData.trips.length,
      stopTimes: parsedData.stopTimes.length,
    };

    console.log('[GTFSDownloader] ✅ Import complete:', result);
    return result;
  } catch (error) {
    console.error('[GTFSDownloader] ❌ Import failed:', error);
    throw error;
  }
}

/**
 * Download and import all İzmir GTFS sources (ESHOT, Metro, İZBAN)
 */
export async function downloadAndImportAllIzmir(
  onProgress?: (stage: string, progress: number, currentSource?: string) => void
): Promise<{ stops: number; routes: number; trips: number; stopTimes: number }> {
  console.log('[GTFSDownloader] Starting İzmir combined GTFS import...');

  const totalSources = IZMIR_SOURCES.length;
  let totalStops = 0;
  let totalRoutes = 0;
  let totalTrips = 0;
  let totalStopTimes = 0;

  try {
    // Clear existing data before importing
    onProgress?.('clearing', 0);
    db.clearAllData();
    onProgress?.('clearing', 1);

    for (let i = 0; i < IZMIR_SOURCES.length; i++) {
      const source = IZMIR_SOURCES[i];
      const sourceInfo = GTFS_SOURCES[source];
      const baseProgress = i / totalSources;
      const progressPerSource = 1 / totalSources;

      console.log(`[GTFSDownloader] Importing ${sourceInfo.name} (${i + 1}/${totalSources})...`);

      // Download ZIP
      onProgress?.('downloading', baseProgress, sourceInfo.name);
      const zipUri = await downloadGTFSZip(sourceInfo.url, (progress) => {
        onProgress?.('downloading', baseProgress + progress * progressPerSource * 0.3, sourceInfo.name);
      });

      // Extract ZIP
      onProgress?.('extracting', baseProgress + progressPerSource * 0.3, sourceInfo.name);
      const gtfsFiles = await extractGTFSZip(zipUri);

      // Parse GTFS data
      onProgress?.('parsing', baseProgress + progressPerSource * 0.5, sourceInfo.name);
      const parsedData = parseGTFSFeed(gtfsFiles);

      // Validate data
      const validation = validateGTFSData(parsedData);
      if (!validation.isValid) {
        console.warn(`[GTFSDownloader] Validation warnings for ${sourceInfo.name}:`, validation.errors);
        // Continue anyway, some sources might have minor issues
      }

      // Insert into database (append, don't clear)
      onProgress?.('importing', baseProgress + progressPerSource * 0.6, sourceInfo.name);

      console.log(`[GTFSDownloader] Inserting ${sourceInfo.name} data...`);
      await db.insertRoutes(parsedData.routes);
      await db.insertStops(parsedData.stops);
      await db.insertTrips(parsedData.trips);

      // Insert stop times in batches
      const batchSize = 10000;
      for (let j = 0; j < parsedData.stopTimes.length; j += batchSize) {
        const batch = parsedData.stopTimes.slice(j, j + batchSize);
        await db.insertStopTimes(batch);
      }

      // Cleanup ZIP
      await FileSystem.deleteAsync(zipUri, { idempotent: true });

      totalStops += parsedData.stops.length;
      totalRoutes += parsedData.routes.length;
      totalTrips += parsedData.trips.length;
      totalStopTimes += parsedData.stopTimes.length;

      onProgress?.('importing', baseProgress + progressPerSource, sourceInfo.name);
    }

    const result = {
      stops: totalStops,
      routes: totalRoutes,
      trips: totalTrips,
      stopTimes: totalStopTimes,
    };

    console.log('[GTFSDownloader] ✅ İzmir combined import complete:', result);
    return result;
  } catch (error) {
    console.error('[GTFSDownloader] ❌ İzmir import failed:', error);
    throw error;
  }
}

/**
 * Check if GTFS data is already imported
 */
export async function isGTFSDataAvailable(): Promise<boolean> {
  try {
    const stops = await db.getAllStops();
    const routes = await db.getAllRoutes();
    return stops.length > 0 && routes.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get GTFS import status
 */
export async function getGTFSImportStatus(): Promise<{
  hasData: boolean;
  counts: {
    stops: number;
    routes: number;
    trips: number;
  };
}> {
  try {
    const [stops, routes] = await Promise.all([
      db.getAllStops(),
      db.getAllRoutes(),
    ]);

    // Count trips (no direct method, so estimate)
    const hasData = stops.length > 0 && routes.length > 0;

    return {
      hasData,
      counts: {
        stops: stops.length,
        routes: routes.length,
        trips: 0, // Would need a new query to get exact count
      },
    };
  } catch (error) {
    console.error('[GTFSDownloader] Error checking import status:', error);
    return {
      hasData: false,
      counts: {
        stops: 0,
        routes: 0,
        trips: 0,
      },
    };
  }
}
