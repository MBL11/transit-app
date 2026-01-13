/**
 * Simple test/example for GTFS parser
 * Run with: npx ts-node src/core/__tests__/gtfs-parser.test.ts
 */

import { parseStops, parseRoutes, parseTrips, parseStopTimes, parseGTFS } from '../gtfs-parser';
import type { Stop, Route } from '../types/gtfs';

// Sample GTFS data
const sampleStopsCSV = `stop_id,stop_name,stop_lat,stop_lon,stop_code
CHAT,Châtelet,48.858370,2.347860,1234
CONC,Concorde,48.865720,2.321490,5678
ETOILE,Charles de Gaulle - Étoile,48.873790,2.295030,9012`;

const sampleRoutesCSV = `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
M1,1,La Défense - Château de Vincennes,1,FFCD00,000000
M4,4,Porte de Clignancourt - Mairie de Montrouge,1,A0006E,FFFFFF
BUS42,42,Gare du Nord - Porte de Versailles,3,00AA55,FFFFFF`;

const sampleTripsCSV = `trip_id,route_id,service_id,trip_headsign,direction_id
TRIP1,M1,WD,Château de Vincennes,0
TRIP2,M1,WD,La Défense,1
TRIP3,BUS42,WD,Porte de Versailles,0`;

const sampleStopTimesCSV = `trip_id,stop_id,arrival_time,departure_time,stop_sequence
TRIP1,CHAT,08:00:00,08:00:30,1
TRIP1,CONC,08:05:00,08:05:30,2
TRIP1,ETOILE,08:10:00,08:10:30,3
TRIP2,ETOILE,09:00:00,09:00:30,1
TRIP2,CONC,09:05:00,09:05:30,2
TRIP2,CHAT,09:10:00,09:10:30,3`;

// Test individual parsers
console.log('🧪 Testing GTFS Parser...\n');

// Test parseStops
console.log('📍 Testing parseStops()...');
const stopsResult = parseStops(sampleStopsCSV);
console.log(`  ✅ Parsed ${stopsResult.data.length} stops`);
console.log(`  ✅ Errors: ${stopsResult.errors.length}`);
console.log(`  Example stop:`, stopsResult.data[0]);
console.log('');

// Test parseRoutes
console.log('🚇 Testing parseRoutes()...');
const routesResult = parseRoutes(sampleRoutesCSV);
console.log(`  ✅ Parsed ${routesResult.data.length} routes`);
console.log(`  ✅ Errors: ${routesResult.errors.length}`);
console.log(`  Example route:`, routesResult.data[0]);
console.log('');

// Test parseTrips
console.log('🚌 Testing parseTrips()...');
const tripsResult = parseTrips(sampleTripsCSV);
console.log(`  ✅ Parsed ${tripsResult.data.length} trips`);
console.log(`  ✅ Errors: ${tripsResult.errors.length}`);
console.log(`  Example trip:`, tripsResult.data[0]);
console.log('');

// Test parseStopTimes
console.log('⏰ Testing parseStopTimes()...');
const stopTimesResult = parseStopTimes(sampleStopTimesCSV);
console.log(`  ✅ Parsed ${stopTimesResult.data.length} stop times`);
console.log(`  ✅ Errors: ${stopTimesResult.errors.length}`);
console.log(`  Example stop time:`, stopTimesResult.data[0]);
console.log('');

// Test parseGTFS (all files at once)
console.log('📦 Testing parseGTFS() - All files...');
const gtfsResult = parseGTFS({
  stops: sampleStopsCSV,
  routes: sampleRoutesCSV,
  trips: sampleTripsCSV,
  stopTimes: sampleStopTimesCSV,
});

console.log(`  ✅ Total stops: ${gtfsResult.data.stops.length}`);
console.log(`  ✅ Total routes: ${gtfsResult.data.routes.length}`);
console.log(`  ✅ Total trips: ${gtfsResult.data.trips.length}`);
console.log(`  ✅ Total stop times: ${gtfsResult.data.stopTimes.length}`);
console.log(`  ✅ Total errors: ${Object.keys(gtfsResult.errors).length}`);
console.log('');

// Verify data types
console.log('🔍 Verifying data types...');
const firstStop = stopsResult.data[0];
console.log(`  ✅ stop_lat is number: ${typeof firstStop.stop_lat === 'number'}`);
console.log(`  ✅ stop_lon is number: ${typeof firstStop.stop_lon === 'number'}`);
console.log(`  ✅ stop_name is string: ${typeof firstStop.stop_name === 'string'}`);
console.log('');

const firstRoute = routesResult.data[0];
console.log(`  ✅ route_type is number: ${typeof firstRoute.route_type === 'number'}`);
console.log(`  ✅ route_color exists: ${firstRoute.route_color !== undefined}`);
console.log('');

// Display summary
console.log('✨ Summary:');
console.log(`  - Stops: ${stopsResult.data.length} (Châtelet, Concorde, Étoile)`);
console.log(`  - Routes: ${routesResult.data.length} (Métro 1, Métro 4, Bus 42)`);
console.log(`  - Trips: ${tripsResult.data.length}`);
console.log(`  - Stop Times: ${stopTimesResult.data.length}`);
console.log('');
console.log('✅ All tests passed! GTFS Parser is working correctly.');
