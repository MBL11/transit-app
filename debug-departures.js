/**
 * Debug script to check departure times in database
 */
const SQLite = require('expo-sqlite');

const db = SQLite.openDatabaseSync('transit.db');

console.log('\n=== DIAGNOSTIC STOP_TIMES ===\n');

// Count total stop_times
const countResult = db.getFirstSync('SELECT COUNT(*) as count FROM stop_times');
console.log('Total stop_times:', countResult.count);

// Get sample times
console.log('\n--- Sample departure times ---');
const sampleTimes = db.getAllSync(
  `SELECT departure_time, routes.short_name, trips.headsign
   FROM stop_times
   JOIN trips ON stop_times.trip_id = trips.id
   JOIN routes ON trips.route_id = routes.id
   LIMIT 20`
);
sampleTimes.forEach(row => {
  console.log(`${row.departure_time} - ${row.short_name} → ${row.headsign}`);
});

// Get min and max times
const timeRange = db.getFirstSync(
  'SELECT MIN(departure_time) as min_time, MAX(departure_time) as max_time FROM stop_times'
);
console.log('\n--- Time range ---');
console.log('Min time:', timeRange.min_time);
console.log('Max time:', timeRange.max_time);

// Current time
const now = new Date();
const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
console.log('\n--- Current time ---');
console.log('Current:', currentTime);

// Check future departures
const futureCount = db.getFirstSync(
  'SELECT COUNT(*) as count FROM stop_times WHERE departure_time >= ?',
  [currentTime]
);
console.log('\n--- Future departures ---');
console.log('Departures after', currentTime, ':', futureCount.count);

// Check for a specific stop
console.log('\n--- Check specific stop ---');
const stops = db.getAllSync('SELECT id, name FROM stops LIMIT 3');
stops.forEach(stop => {
  const stopDepartures = db.getFirstSync(
    `SELECT COUNT(*) as count
     FROM stop_times
     WHERE stop_id = ? AND departure_time >= ?`,
    [stop.id, currentTime]
  );
  console.log(`Stop ${stop.id} (${stop.name}): ${stopDepartures.count} future departures`);
});
