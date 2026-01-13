/**
 * Test script for Paris Adapter
 * Run this to verify the adapter works with the database
 */

import { parisAdapter } from './paris-adapter';

async function testAdapter() {
  console.log('='.repeat(60));
  console.log('Testing Paris Adapter');
  console.log('='.repeat(60));

  try {
    // Initialize adapter
    console.log('\n1. Initializing adapter...');
    await parisAdapter.initialize();

    // Test config
    console.log('\n2. Testing config...');
    console.log('City:', parisAdapter.config.cityName);
    console.log('Timezone:', parisAdapter.config.timezone);
    console.log('Center:', parisAdapter.config.defaultCenter);

    // Test data source
    console.log('\n3. Testing data source...');
    const dataSource = parisAdapter.getDataSource();
    console.log('Source:', dataSource.name);
    console.log('License:', dataSource.license);

    // Test loading stops
    console.log('\n4. Testing loadStops()...');
    const stops = await parisAdapter.loadStops();
    console.log(`✅ Loaded ${stops.length} stops`);
    if (stops.length > 0) {
      console.log('Sample stop:', stops[0]);
    }

    // Test loading routes
    console.log('\n5. Testing loadRoutes()...');
    const routes = await parisAdapter.loadRoutes();
    console.log(`✅ Loaded ${routes.length} routes`);
    if (routes.length > 0) {
      console.log('Sample route:', routes[0]);
    }

    // Test loading trips
    console.log('\n6. Testing loadTrips()...');
    const trips = await parisAdapter.loadTrips();
    console.log(`✅ Loaded ${trips.length} trips`);
    if (trips.length > 0) {
      console.log('Sample trip:', trips[0]);
    }

    // Test loading stop times
    console.log('\n7. Testing loadStopTimes()...');
    const stopTimes = await parisAdapter.loadStopTimes();
    console.log(`✅ Loaded ${stopTimes.length} stop times`);
    if (stopTimes.length > 0) {
      console.log('Sample stop time:', stopTimes[0]);
    }

    // Test next departures (if data exists)
    if (stops.length > 0) {
      console.log('\n8. Testing getNextDepartures()...');
      const departures = await parisAdapter.getNextDepartures(stops[0].id);
      console.log(`✅ Found ${departures.length} next departures`);
      if (departures.length > 0) {
        console.log('Sample departure:', departures[0]);
      }
    }

    // Test alerts
    console.log('\n9. Testing getAlerts()...');
    const alerts = await parisAdapter.getAlerts();
    console.log(`✅ Found ${alerts.length} alerts`);

    // Test last update
    console.log('\n10. Testing getLastUpdate()...');
    const lastUpdate = parisAdapter.getLastUpdate();
    console.log('Last update:', lastUpdate);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAdapter().catch(console.error);
}

export { testAdapter };
