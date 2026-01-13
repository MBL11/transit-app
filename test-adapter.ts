/**
 * Test script for Paris Adapter
 * Run with: npx tsx test-adapter.ts
 */

import { parisAdapter } from './src/adapters/paris/paris-adapter';
import { importGTFSToDatabase, getImportStatus } from './src/core/gtfs-importer';
import * as db from './src/core/database';

// Sample GTFS data (same as parser test)
const SAMPLE_STOPS_CSV = `stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station
STOP001,Gare du Nord,48.8809,2.3553,0,
STOP002,Châtelet,48.8584,2.3470,0,
STOP003,République,48.8673,2.3636,0,
STOP004,Nation,48.8484,2.3966,0,
STOP005,Bastille,48.8532,2.3689,0,`;

const SAMPLE_ROUTES_CSV = `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
ROUTE001,1,Métro Ligne 1,1,FFCD00,000000
ROUTE002,14,Métro Ligne 14,1,62259D,FFFFFF
ROUTE003,91,Bus 91,3,82C8E6,000000`;

const SAMPLE_TRIPS_CSV = `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
ROUTE001,SERVICE1,TRIP001,La Défense,0,SHAPE001
ROUTE001,SERVICE1,TRIP002,Château de Vincennes,1,SHAPE002
ROUTE002,SERVICE1,TRIP003,Olympiades,0,SHAPE003
ROUTE003,SERVICE1,TRIP004,Montparnasse,0,SHAPE004`;

const SAMPLE_STOP_TIMES_CSV = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
TRIP001,08:00:00,08:00:00,STOP001,1
TRIP001,08:05:00,08:05:00,STOP002,2
TRIP001,08:10:00,08:10:00,STOP003,3
TRIP001,08:15:00,08:15:00,STOP004,4
TRIP002,09:00:00,09:00:00,STOP004,1
TRIP002,09:05:00,09:05:00,STOP003,2
TRIP002,09:10:00,09:10:00,STOP002,3
TRIP003,10:00:00,10:00:00,STOP001,1
TRIP003,10:03:00,10:03:00,STOP005,2
TRIP004,11:00:00,11:00:00,STOP002,1
TRIP004,11:10:00,11:10:00,STOP005,2`;

async function setupTestData() {
  console.log('\n📦 Setting up test data...');

  try {
    // Clear existing data
    console.log('  Clearing old data...');
    await db.dropAllTables();

    // Import sample data
    console.log('  Importing sample GTFS data...');
    await importGTFSToDatabase({
      stops: SAMPLE_STOPS_CSV,
      routes: SAMPLE_ROUTES_CSV,
      trips: SAMPLE_TRIPS_CSV,
      stopTimes: SAMPLE_STOP_TIMES_CSV,
    });

    console.log('  ✅ Test data imported successfully\n');
  } catch (error) {
    console.error('  ❌ Failed to setup test data:', error);
    throw error;
  }
}

async function testAdapter() {
  console.log('█'.repeat(60));
  console.log('PARIS ADAPTER TEST');
  console.log('█'.repeat(60));

  try {
    // Setup test data first
    await setupTestData();

    // Test 1: Initialize adapter
    console.log('\n1️⃣  Testing initialize()...');
    await parisAdapter.initialize();
    console.log('  ✅ Adapter initialized');

    // Test 2: Get config
    console.log('\n2️⃣  Testing config...');
    const config = parisAdapter.config;
    console.log('  City:', config.cityName);
    console.log('  Timezone:', config.timezone);
    console.log('  Center:', config.defaultCenter);
    console.log('  Bounding box:', config.boundingBox);
    console.log('  Currency:', config.currency);
    console.log('  Distance unit:', config.distanceUnit);
    console.log('  ✅ Config retrieved');

    // Test 3: Get data source
    console.log('\n3️⃣  Testing getDataSource()...');
    const dataSource = parisAdapter.getDataSource();
    console.log('  Name:', dataSource.name);
    console.log('  URL:', dataSource.url);
    console.log('  License:', dataSource.license);
    console.log('  ✅ Data source retrieved');

    // Test 4: Get last update
    console.log('\n4️⃣  Testing getLastUpdate()...');
    const lastUpdate = parisAdapter.getLastUpdate();
    console.log('  Last update:', lastUpdate.toISOString());
    console.log('  ✅ Last update retrieved');

    // Test 5: Load stops
    console.log('\n5️⃣  Testing loadStops()...');
    const stops = await parisAdapter.loadStops();
    console.log(`  ✅ Loaded ${stops.length} stops`);
    if (stops.length > 0) {
      console.log('  Sample stop:', stops[0]);
    }

    // Test 6: Load routes
    console.log('\n6️⃣  Testing loadRoutes()...');
    const routes = await parisAdapter.loadRoutes();
    console.log(`  ✅ Loaded ${routes.length} routes`);
    if (routes.length > 0) {
      console.log('  Sample route:', routes[0]);
    }

    // Test 7: Load trips
    console.log('\n7️⃣  Testing loadTrips()...');
    const trips = await parisAdapter.loadTrips();
    console.log(`  ✅ Loaded ${trips.length} trips`);
    if (trips.length > 0) {
      console.log('  Sample trip:', trips[0]);
    }

    // Test 8: Load stop times
    console.log('\n8️⃣  Testing loadStopTimes()...');
    const stopTimes = await parisAdapter.loadStopTimes();
    console.log(`  ✅ Loaded ${stopTimes.length} stop times`);
    if (stopTimes.length > 0) {
      console.log('  Sample stop time:', stopTimes[0]);
    }

    // Test 9: Get next departures for a stop
    if (stops.length > 0) {
      console.log('\n9️⃣  Testing getNextDepartures()...');
      const departures = await parisAdapter.getNextDepartures(stops[0].id);
      console.log(`  ✅ Found ${departures.length} next departures from ${stops[0].name}`);
      if (departures.length > 0) {
        console.log('  Sample departure:', {
          route: departures[0].routeShortName,
          headsign: departures[0].headsign,
          time: departures[0].departureTime.toLocaleTimeString(),
          realtime: departures[0].isRealtime,
        });
      }
    }

    // Test 10: Get alerts
    console.log('\n🔟 Testing getAlerts()...');
    const alerts = await parisAdapter.getAlerts();
    console.log(`  ✅ Found ${alerts.length} alerts`);
    if (alerts.length === 0) {
      console.log('  (Alerts API not yet implemented - this is expected)');
    }

    // Test 11: Check import status
    console.log('\n1️⃣1️⃣  Testing getImportStatus()...');
    const status = getImportStatus();
    console.log('  Has data:', status.hasData);
    console.log('  Stats:', status.stats);
    console.log('  ✅ Import status retrieved');

    // Summary
    console.log('\n' + '█'.repeat(60));
    console.log('✅ ALL ADAPTER TESTS PASSED!');
    console.log('█'.repeat(60));
    console.log('\nSummary:');
    console.log(`  Stops:      ${stops.length}`);
    console.log(`  Routes:     ${routes.length}`);
    console.log(`  Trips:      ${trips.length}`);
    console.log(`  Stop Times: ${stopTimes.length}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

// Run the test
console.log('\nStarting Paris Adapter Tests...\n');
testAdapter()
  .then(() => {
    console.log('All tests completed successfully! ✅\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest suite failed:', error);
    process.exit(1);
  });
