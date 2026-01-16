/**
 * Script to reimport GTFS data
 * Run this with: node reimport-data.js
 */

const SQLite = require('expo-sqlite');
const db = SQLite.openDatabaseSync('transit.db');

console.log('\n=== REIMPORTING GTFS DATA ===\n');

// Sample GTFS data for Paris (same as used initially)
const routes = [
  { id: 'M1', short_name: 'M1', long_name: 'Métro 1', type: 1, color: '#FFCD00', text_color: '#000000' },
  { id: 'M4', short_name: 'M4', long_name: 'Métro 4', type: 1, color: '#BC1A8D', text_color: '#FFFFFF' },
  { id: 'M14', short_name: 'M14', long_name: 'Métro 14', type: 1, color: '#62259D', text_color: '#FFFFFF' },
  { id: 'B21', short_name: 'B21', long_name: 'Bus 21', type: 3, color: '#82C8E6', text_color: '#000000' },
  { id: 'B38', short_name: 'B38', long_name: 'Bus 38', type: 3, color: '#FF7E2E', text_color: '#000000' },
];

const stops = [
  { id: 'STOP001', name: 'La Défense', lat: 48.8920, lon: 2.2380, location_type: 0, parent_station: null },
  { id: 'STOP002', name: 'Châtelet', lat: 48.8583, lon: 2.3470, location_type: 0, parent_station: null },
  { id: 'STOP003', name: 'Gare de Lyon', lat: 48.8444, lon: 2.3739, location_type: 0, parent_station: null },
  { id: 'STOP004', name: 'Saint-Lazare', lat: 48.8760, lon: 2.3260, location_type: 0, parent_station: null },
  { id: 'STOP005', name: 'République', lat: 48.8674, lon: 2.3637, location_type: 0, parent_station: null },
  { id: 'STOP006', name: 'Bastille', lat: 48.8530, lon: 2.3690, location_type: 0, parent_station: null },
  { id: 'STOP007', name: 'Nation', lat: 48.8480, lon: 2.3960, location_type: 0, parent_station: null },
];

const trips = [
  { id: 'TRIP001', route_id: 'M1', service_id: 'WD', headsign: 'Château de Vincennes', direction_id: 0, shape_id: null },
  { id: 'TRIP002', route_id: 'M1', service_id: 'WD', headsign: 'La Défense', direction_id: 1, shape_id: null },
  { id: 'TRIP003', route_id: 'M4', service_id: 'WD', headsign: 'Porte de Clignancourt', direction_id: 0, shape_id: null },
  { id: 'TRIP004', route_id: 'B21', service_id: 'WD', headsign: 'Gare Saint-Lazare', direction_id: 0, shape_id: null },
];

const stopTimes = [
  { trip_id: 'TRIP001', arrival_time: '08:30:00', departure_time: '08:30:00', stop_id: 'STOP001', stop_sequence: 1 },
  { trip_id: 'TRIP001', arrival_time: '08:45:00', departure_time: '08:45:00', stop_id: 'STOP002', stop_sequence: 2 },
  { trip_id: 'TRIP001', arrival_time: '09:00:00', departure_time: '09:00:00', stop_id: 'STOP003', stop_sequence: 3 },
  { trip_id: 'TRIP002', arrival_time: '10:00:00', departure_time: '10:00:00', stop_id: 'STOP003', stop_sequence: 1 },
  { trip_id: 'TRIP002', arrival_time: '10:15:00', departure_time: '10:15:00', stop_id: 'STOP001', stop_sequence: 2 },
];

try {
  // Clear existing data
  console.log('Clearing existing data...');
  db.runSync('DELETE FROM stop_times');
  db.runSync('DELETE FROM trips');
  db.runSync('DELETE FROM stops');
  db.runSync('DELETE FROM routes');

  // Insert routes
  console.log('\nInserting routes...');
  routes.forEach(route => {
    db.runSync(
      'INSERT INTO routes (id, short_name, long_name, type, color, text_color) VALUES (?, ?, ?, ?, ?, ?)',
      [route.id, route.short_name, route.long_name, route.type, route.color, route.text_color]
    );
    console.log(`  ✓ ${route.short_name} - ${route.long_name}`);
  });

  // Insert stops
  console.log('\nInserting stops...');
  stops.forEach(stop => {
    db.runSync(
      'INSERT INTO stops (id, name, lat, lon, location_type, parent_station) VALUES (?, ?, ?, ?, ?, ?)',
      [stop.id, stop.name, stop.lat, stop.lon, stop.location_type, stop.parent_station]
    );
    console.log(`  ✓ ${stop.name}`);
  });

  // Insert trips
  console.log('\nInserting trips...');
  trips.forEach(trip => {
    db.runSync(
      'INSERT INTO trips (id, route_id, service_id, headsign, direction_id, shape_id) VALUES (?, ?, ?, ?, ?, ?)',
      [trip.id, trip.route_id, trip.service_id, trip.headsign, trip.direction_id, trip.shape_id]
    );
    console.log(`  ✓ ${trip.id} - ${trip.headsign}`);
  });

  // Insert stop_times
  console.log('\nInserting stop_times...');
  stopTimes.forEach(st => {
    db.runSync(
      'INSERT INTO stop_times (trip_id, arrival_time, departure_time, stop_id, stop_sequence) VALUES (?, ?, ?, ?, ?)',
      [st.trip_id, st.arrival_time, st.departure_time, st.stop_id, st.stop_sequence]
    );
    console.log(`  ✓ ${st.trip_id} at ${st.stop_id} (${st.departure_time})`);
  });

  console.log('\n✅ Data imported successfully!');
  console.log('\nDatabase stats:');
  const stats = {
    routes: db.getFirstSync('SELECT COUNT(*) as count FROM routes').count,
    stops: db.getFirstSync('SELECT COUNT(*) as count FROM stops').count,
    trips: db.getFirstSync('SELECT COUNT(*) as count FROM trips').count,
    stop_times: db.getFirstSync('SELECT COUNT(*) as count FROM stop_times').count,
  };
  console.log(JSON.stringify(stats, null, 2));

} catch (error) {
  console.error('❌ Error importing data:', error);
  process.exit(1);
}
