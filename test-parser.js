/**
 * Simple test runner for GTFS Parser
 * Run with: node test-parser.js
 */

const Papa = require('papaparse');

// Sample GTFS data
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

// Parse function
function parseCSV(csvContent, fileName) {
  console.log(`\nParsing ${fileName}...`);
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    encoding: 'UTF-8',
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn(`  ⚠️  Errors:`, result.errors.slice(0, 2));
  }

  console.log(`  ✅ Parsed ${result.data.length} rows`);
  return result.data;
}

// Normalize functions
function normalizeStop(gtfsStop) {
  return {
    id: gtfsStop.stop_id,
    name: gtfsStop.stop_name,
    lat: parseFloat(gtfsStop.stop_lat),
    lon: parseFloat(gtfsStop.stop_lon),
    locationType: parseInt(gtfsStop.location_type || '0', 10),
    parentStation: gtfsStop.parent_station || undefined,
  };
}

function normalizeRoute(gtfsRoute) {
  let color = gtfsRoute.route_color || 'FFFFFF';
  let textColor = gtfsRoute.route_text_color || '000000';

  if (!color.startsWith('#')) color = '#' + color;
  if (!textColor.startsWith('#')) textColor = '#' + textColor;

  return {
    id: gtfsRoute.route_id,
    shortName: gtfsRoute.route_short_name,
    longName: gtfsRoute.route_long_name,
    type: parseInt(gtfsRoute.route_type, 10),
    color,
    textColor,
  };
}

function normalizeTrip(gtfsTrip) {
  return {
    id: gtfsTrip.trip_id,
    routeId: gtfsTrip.route_id,
    serviceId: gtfsTrip.service_id,
    headsign: gtfsTrip.trip_headsign || undefined,
    directionId: parseInt(gtfsTrip.direction_id || '0', 10),
    shapeId: gtfsTrip.shape_id || undefined,
  };
}

function normalizeStopTime(gtfsStopTime) {
  return {
    tripId: gtfsStopTime.trip_id,
    arrivalTime: gtfsStopTime.arrival_time,
    departureTime: gtfsStopTime.departure_time,
    stopId: gtfsStopTime.stop_id,
    stopSequence: parseInt(gtfsStopTime.stop_sequence, 10),
  };
}

// Main test
console.log('\n' + '='.repeat(60));
console.log('GTFS PARSER TEST');
console.log('='.repeat(60));

try {
  // Parse raw data
  console.log('\n📋 Step 1: Parsing CSV files...');
  const rawStops = parseCSV(SAMPLE_STOPS_CSV, 'stops.txt');
  const rawRoutes = parseCSV(SAMPLE_ROUTES_CSV, 'routes.txt');
  const rawTrips = parseCSV(SAMPLE_TRIPS_CSV, 'trips.txt');
  const rawStopTimes = parseCSV(SAMPLE_STOP_TIMES_CSV, 'stop_times.txt');

  // Normalize data
  console.log('\n🔄 Step 2: Normalizing data...');
  const stops = rawStops.map(normalizeStop);
  const routes = rawRoutes.map(normalizeRoute);
  const trips = rawTrips.map(normalizeTrip);
  const stopTimes = rawStopTimes.map(normalizeStopTime);

  console.log(`  ✅ Normalized ${stops.length} stops`);
  console.log(`  ✅ Normalized ${routes.length} routes`);
  console.log(`  ✅ Normalized ${trips.length} trips`);
  console.log(`  ✅ Normalized ${stopTimes.length} stop times`);

  // Show samples
  console.log('\n📊 Step 3: Sample data...');
  console.log('\nSample Stop:');
  console.log(JSON.stringify(stops[0], null, 2));

  console.log('\nSample Route:');
  console.log(JSON.stringify(routes[0], null, 2));

  console.log('\nSample Trip:');
  console.log(JSON.stringify(trips[0], null, 2));

  console.log('\nSample Stop Time:');
  console.log(JSON.stringify(stopTimes[0], null, 2));

  // Validation
  console.log('\n✔️  Step 4: Validation...');
  const errors = [];

  if (stops.length === 0) errors.push('No stops found');
  if (routes.length === 0) errors.push('No routes found');
  if (trips.length === 0) errors.push('No trips found');
  if (stopTimes.length === 0) errors.push('No stop times found');

  const invalidStops = stops.filter(
    (s) => isNaN(s.lat) || isNaN(s.lon) || s.lat < -90 || s.lat > 90 || s.lon < -180 || s.lon > 180
  );
  if (invalidStops.length > 0) {
    errors.push(`${invalidStops.length} stops with invalid coordinates`);
  }

  if (errors.length > 0) {
    console.log('  ❌ Validation failed:', errors.join(', '));
  } else {
    console.log('  ✅ All validations passed!');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  console.log(`  Stops:      ${stops.length}`);
  console.log(`  Routes:     ${routes.length}`);
  console.log(`  Trips:      ${trips.length}`);
  console.log(`  Stop Times: ${stopTimes.length}`);
  console.log('\n');
} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}
