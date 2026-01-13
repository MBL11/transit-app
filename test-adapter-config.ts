/**
 * Test Paris Adapter Configuration
 * Tests only the config (no React Native dependencies)
 * Run with: npx tsx test-adapter-config.ts
 */

import { parisConfig, parisDataSource, parisGTFSUrls, parisTransportTypes } from './src/adapters/paris/config';

console.log('\n' + '█'.repeat(60));
console.log('PARIS ADAPTER - CONFIGURATION TEST');
console.log('█'.repeat(60));

try {
  // Test 1: Basic config
  console.log('\n1️⃣  Testing basic configuration...');
  console.log('  📍 City:', parisConfig.cityName);
  console.log('  🌍 Timezone:', parisConfig.timezone);
  console.log('  💰 Currency:', parisConfig.currency);
  console.log('  📏 Distance Unit:', parisConfig.distanceUnit);

  if (parisConfig.cityName !== 'Paris') throw new Error('Wrong city');
  if (parisConfig.timezone !== 'Europe/Paris') throw new Error('Wrong timezone');
  if (parisConfig.currency !== 'EUR') throw new Error('Wrong currency');
  if (parisConfig.distanceUnit !== 'metric') throw new Error('Wrong distance unit');

  console.log('  ✅ Basic config valid');

  // Test 2: Locales
  console.log('\n2️⃣  Testing locales...');
  console.log('  Default:', parisConfig.defaultLocale);
  console.log('  Supported:', parisConfig.supportedLocales.join(', '));

  if (parisConfig.defaultLocale !== 'fr') throw new Error('Wrong default locale');
  if (!parisConfig.supportedLocales.includes('fr')) throw new Error('Missing fr locale');
  if (!parisConfig.supportedLocales.includes('en')) throw new Error('Missing en locale');

  console.log('  ✅ Locales valid');

  // Test 3: Geographic bounds
  console.log('\n3️⃣  Testing geographic configuration...');
  const [minLat, minLon, maxLat, maxLon] = parisConfig.boundingBox;
  const [centerLat, centerLon] = parisConfig.defaultCenter;

  console.log('  Bounding Box:');
  console.log(`    SW: ${minLat}, ${minLon}`);
  console.log(`    NE: ${maxLat}, ${maxLon}`);
  console.log('  Center:', centerLat, centerLon);
  console.log('  Default Zoom:', parisConfig.defaultZoom);

  // Validate bounding box
  if (minLat >= maxLat) throw new Error('Invalid bbox: minLat >= maxLat');
  if (minLon >= maxLon) throw new Error('Invalid bbox: minLon >= maxLon');

  // Validate center is within bounds
  if (centerLat < minLat || centerLat > maxLat) {
    throw new Error('Center lat outside bounds');
  }
  if (centerLon < minLon || centerLon > maxLon) {
    throw new Error('Center lon outside bounds');
  }

  // Check Paris center (approximately 48.856, 2.352)
  if (Math.abs(centerLat - 48.8566) > 0.1) {
    throw new Error('Center not in Paris area');
  }

  console.log('  ✅ Geographic config valid');

  // Test 4: Data source
  console.log('\n4️⃣  Testing data source configuration...');
  console.log('  Name:', parisDataSource.name);
  console.log('  URL:', parisDataSource.url);
  console.log('  License:', parisDataSource.license);

  if (!parisDataSource.name.includes('IDFM')) {
    throw new Error('Wrong data source name');
  }
  if (!parisDataSource.url.includes('iledefrance-mobilites')) {
    throw new Error('Wrong data source URL');
  }
  if (!parisDataSource.license.includes('ODbL')) {
    throw new Error('Wrong license');
  }

  console.log('  ✅ Data source valid');

  // Test 5: GTFS URLs
  console.log('\n5️⃣  Testing GTFS URLs...');
  console.log('  Static GTFS:');
  console.log('    ', parisGTFSUrls.static);
  console.log('  Realtime API:');
  console.log('    ', parisGTFSUrls.realtimeBase);

  if (!parisGTFSUrls.static.includes('gtfs')) {
    throw new Error('Invalid static GTFS URL');
  }
  if (!parisGTFSUrls.realtimeBase.includes('prim.iledefrance-mobilites')) {
    throw new Error('Invalid realtime URL');
  }

  console.log('  ✅ GTFS URLs valid');

  // Test 6: Transport types
  console.log('\n6️⃣  Testing transport types mapping...');
  const expectedTypes: { [key: number]: string } = {
    0: 'Tramway',
    1: 'Métro',
    2: 'RER/Train',
    3: 'Bus',
  };

  for (const [typeId, typeName] of Object.entries(expectedTypes)) {
    const configType = parisTransportTypes[parseInt(typeId) as keyof typeof parisTransportTypes];
    console.log(`  ${typeId} = ${configType}`);
    if (configType !== typeName) {
      throw new Error(`Wrong transport type for ${typeId}`);
    }
  }

  console.log('  ✅ Transport types valid');

  // Test 7: Type safety
  console.log('\n7️⃣  Testing TypeScript types...');

  // These should compile without errors
  const testCenter: [number, number] = parisConfig.defaultCenter;
  const testBbox: [number, number, number, number] = parisConfig.boundingBox;
  const testUnit: 'metric' | 'imperial' = parisConfig.distanceUnit;

  console.log('  ✅ Types are correctly defined');

  // Summary
  console.log('\n' + '█'.repeat(60));
  console.log('✅ ALL CONFIGURATION TESTS PASSED!');
  console.log('█'.repeat(60));
  console.log('\n📊 Configuration Summary:');
  console.log(`  City: ${parisConfig.cityName}`);
  console.log(`  Timezone: ${parisConfig.timezone}`);
  console.log(`  Center: ${parisConfig.defaultCenter[0]}, ${parisConfig.defaultCenter[1]}`);
  console.log(`  Locales: ${parisConfig.supportedLocales.join(', ')}`);
  console.log(`  Data: ${parisDataSource.name}`);
  console.log('\n💡 Config is ready for Paris transit data!');
  console.log('📱 To test full adapter, run in Expo app environment\n');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error);
  process.exit(1);
}
