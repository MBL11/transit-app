/**
 * Simple Paris Adapter Test (no database required)
 * Tests the adapter structure and configuration
 * Run with: npx tsx test-adapter-simple.ts
 */

import { parisAdapter } from './src/adapters/paris/paris-adapter';
import { parisConfig, parisDataSource, parisGTFSUrls } from './src/adapters/paris/config';

console.log('\n' + '█'.repeat(60));
console.log('PARIS ADAPTER - STRUCTURE TEST');
console.log('█'.repeat(60));

try {
  // Test 1: Config
  console.log('\n1️⃣  Testing config...');
  const config = parisAdapter.config;

  console.log('  City Name:', config.cityName);
  console.log('  Default Locale:', config.defaultLocale);
  console.log('  Supported Locales:', config.supportedLocales.join(', '));
  console.log('  Timezone:', config.timezone);
  console.log('  Bounding Box:', config.boundingBox);
  console.log('  Default Center:', config.defaultCenter);
  console.log('  Default Zoom:', config.defaultZoom);
  console.log('  Currency:', config.currency);
  console.log('  Distance Unit:', config.distanceUnit);

  if (config.cityName !== 'Paris') throw new Error('Wrong city name');
  if (config.timezone !== 'Europe/Paris') throw new Error('Wrong timezone');
  if (config.currency !== 'EUR') throw new Error('Wrong currency');

  console.log('  ✅ Config is valid');

  // Test 2: Data Source
  console.log('\n2️⃣  Testing data source...');
  const dataSource = parisAdapter.getDataSource();

  console.log('  Name:', dataSource.name);
  console.log('  URL:', dataSource.url);
  console.log('  License:', dataSource.license);
  console.log('  Attribution:', dataSource.attribution);

  if (!dataSource.name.includes('IDFM')) throw new Error('Wrong data source');

  console.log('  ✅ Data source is valid');

  // Test 3: GTFS URLs
  console.log('\n3️⃣  Testing GTFS URLs...');
  console.log('  Static GTFS:', parisGTFSUrls.static);
  console.log('  Realtime Base:', parisGTFSUrls.realtimeBase);

  if (!parisGTFSUrls.static.includes('gtfs')) throw new Error('Invalid GTFS URL');

  console.log('  ✅ GTFS URLs configured');

  // Test 4: Adapter methods exist
  console.log('\n4️⃣  Testing adapter methods...');
  const methods = [
    'loadStops',
    'loadRoutes',
    'loadTrips',
    'loadStopTimes',
    'loadShapes',
    'getNextDepartures',
    'getAlerts',
    'getDataSource',
    'getLastUpdate',
    'initialize',
  ];

  for (const method of methods) {
    if (typeof (parisAdapter as any)[method] !== 'function') {
      throw new Error(`Method ${method} not found`);
    }
    console.log(`  ✅ ${method}() exists`);
  }

  // Test 5: Config validation
  console.log('\n5️⃣  Testing config validation...');

  // Check bounding box
  const [minLat, minLon, maxLat, maxLon] = config.boundingBox;
  if (minLat >= maxLat) throw new Error('Invalid bounding box: minLat >= maxLat');
  if (minLon >= maxLon) throw new Error('Invalid bounding box: minLon >= maxLon');
  console.log('  ✅ Bounding box valid');

  // Check center is within bounds
  const [centerLat, centerLon] = config.defaultCenter;
  if (centerLat < minLat || centerLat > maxLat) {
    throw new Error('Center latitude outside bounds');
  }
  if (centerLon < minLon || centerLon > maxLon) {
    throw new Error('Center longitude outside bounds');
  }
  console.log('  ✅ Center coordinates valid');

  // Check zoom level
  if (config.defaultZoom < 1 || config.defaultZoom > 20) {
    throw new Error('Invalid zoom level');
  }
  console.log('  ✅ Zoom level valid');

  // Test 6: Interface compliance
  console.log('\n6️⃣  Testing interface compliance...');

  // Check readonly config
  if (!parisAdapter.hasOwnProperty('config')) {
    throw new Error('Config property missing');
  }
  console.log('  ✅ Has config property');

  // Check all required methods
  const requiredMethods = [
    'loadStops',
    'loadRoutes',
    'loadTrips',
    'loadStopTimes',
    'getNextDepartures',
    'getAlerts',
    'getDataSource',
    'getLastUpdate',
  ];

  for (const method of requiredMethods) {
    if (typeof (parisAdapter as any)[method] !== 'function') {
      throw new Error(`Required method ${method} not implemented`);
    }
  }
  console.log('  ✅ All required methods implemented');

  // Summary
  console.log('\n' + '█'.repeat(60));
  console.log('✅ ALL STRUCTURE TESTS PASSED!');
  console.log('█'.repeat(60));
  console.log('\n✨ Paris Adapter structure is valid');
  console.log('📝 To test with real data, run in Expo app environment');
  console.log('📖 See TEST_README.md for database tests\n');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error);
  process.exit(1);
}
