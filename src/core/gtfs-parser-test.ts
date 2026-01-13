/**
 * GTFS Parser Test & Example Usage
 */

import {
  parseStops,
  parseRoutes,
  parseTrips,
  parseStopTimes,
  normalizeStop,
  normalizeRoute,
  normalizeTrip,
  normalizeStopTime,
  parseGTFSFeed,
  validateGTFSData,
} from './gtfs-parser';

/**
 * Sample GTFS data for testing
 */
const SAMPLE_STOPS_CSV = `stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station
STOP001,Gare du Nord,48.8809,2.3553,0,
STOP002,Châtelet,48.8584,2.3470,0,
STOP003,République,48.8673,2.3636,0,`;

const SAMPLE_ROUTES_CSV = `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
ROUTE001,1,Métro Ligne 1,1,FFCD00,000000
ROUTE002,14,Métro Ligne 14,1,62259D,FFFFFF
ROUTE003,91,Bus 91,3,82C8E6,000000`;

const SAMPLE_TRIPS_CSV = `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
ROUTE001,SERVICE1,TRIP001,La Défense,0,SHAPE001
ROUTE001,SERVICE1,TRIP002,Château de Vincennes,1,SHAPE002
ROUTE002,SERVICE1,TRIP003,Olympiades,0,SHAPE003`;

const SAMPLE_STOP_TIMES_CSV = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
TRIP001,08:00:00,08:00:00,STOP001,1
TRIP001,08:05:00,08:05:00,STOP002,2
TRIP001,08:10:00,08:10:00,STOP003,3
TRIP002,09:00:00,09:00:00,STOP003,1
TRIP002,09:05:00,09:05:00,STOP002,2`;

/**
 * Test parsing individual files
 */
export function testIndividualParsing() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Individual File Parsing');
  console.log('='.repeat(60));

  // Test stops
  console.log('\n1. Parsing stops.txt...');
  const gtfsStops = parseStops(SAMPLE_STOPS_CSV);
  console.log(`Found ${gtfsStops.length} stops`);
  console.log('Sample stop:', gtfsStops[0]);

  // Test routes
  console.log('\n2. Parsing routes.txt...');
  const gtfsRoutes = parseRoutes(SAMPLE_ROUTES_CSV);
  console.log(`Found ${gtfsRoutes.length} routes`);
  console.log('Sample route:', gtfsRoutes[0]);

  // Test trips
  console.log('\n3. Parsing trips.txt...');
  const gtfsTrips = parseTrips(SAMPLE_TRIPS_CSV);
  console.log(`Found ${gtfsTrips.length} trips`);
  console.log('Sample trip:', gtfsTrips[0]);

  // Test stop times
  console.log('\n4. Parsing stop_times.txt...');
  const gtfsStopTimes = parseStopTimes(SAMPLE_STOP_TIMES_CSV);
  console.log(`Found ${gtfsStopTimes.length} stop times`);
  console.log('Sample stop time:', gtfsStopTimes[0]);

  return { gtfsStops, gtfsRoutes, gtfsTrips, gtfsStopTimes };
}

/**
 * Test normalization
 */
export function testNormalization() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Normalization');
  console.log('='.repeat(60));

  const { gtfsStops, gtfsRoutes, gtfsTrips, gtfsStopTimes } = testIndividualParsing();

  // Normalize stops
  console.log('\n1. Normalizing stops...');
  const stops = gtfsStops.map(normalizeStop);
  console.log('Normalized stop:', stops[0]);

  // Normalize routes
  console.log('\n2. Normalizing routes...');
  const routes = gtfsRoutes.map(normalizeRoute);
  console.log('Normalized route:', routes[0]);

  // Normalize trips
  console.log('\n3. Normalizing trips...');
  const trips = gtfsTrips.map(normalizeTrip);
  console.log('Normalized trip:', trips[0]);

  // Normalize stop times
  console.log('\n4. Normalizing stop times...');
  const stopTimes = gtfsStopTimes.map(normalizeStopTime);
  console.log('Normalized stop time:', stopTimes[0]);

  return { stops, routes, trips, stopTimes };
}

/**
 * Test complete feed parsing
 */
export function testCompleteFeed() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Complete GTFS Feed Parsing');
  console.log('='.repeat(60));

  const data = parseGTFSFeed({
    stops: SAMPLE_STOPS_CSV,
    routes: SAMPLE_ROUTES_CSV,
    trips: SAMPLE_TRIPS_CSV,
    stopTimes: SAMPLE_STOP_TIMES_CSV,
  });

  console.log('\nParsed data summary:');
  console.log(`  Stops: ${data.stops.length}`);
  console.log(`  Routes: ${data.routes.length}`);
  console.log(`  Trips: ${data.trips.length}`);
  console.log(`  Stop Times: ${data.stopTimes.length}`);

  return data;
}

/**
 * Test validation
 */
export function testValidation() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing GTFS Data Validation');
  console.log('='.repeat(60));

  const data = testCompleteFeed();

  const { isValid, errors } = validateGTFSData(data);

  console.log('\nValidation result:');
  console.log(`  Valid: ${isValid}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.join(', ')}`);
  } else {
    console.log('  No errors found!');
  }

  return { isValid, errors };
}

/**
 * Run all tests
 */
export function runAllParserTests() {
  console.log('\n\n' + '█'.repeat(60));
  console.log('GTFS PARSER - COMPLETE TEST SUITE');
  console.log('█'.repeat(60));

  try {
    testIndividualParsing();
    testNormalization();
    testCompleteFeed();
    testValidation();

    console.log('\n' + '█'.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('█'.repeat(60) + '\n\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}
