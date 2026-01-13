/**
 * Example usage of GTFS parser
 * Can be imported and used in the app
 */

import { parseStops, parseRoutes, parseGTFS } from '../gtfs-parser';

// Sample GTFS data (Paris Metro lines)
export const sampleStopsCSV = `stop_id,stop_name,stop_lat,stop_lon,stop_code
CHAT,Châtelet,48.858370,2.347860,1234
CONC,Concorde,48.865720,2.321490,5678
ETOILE,Charles de Gaulle - Étoile,48.873790,2.295030,9012
DEFENSE,La Défense,48.892320,2.237980,3456`;

export const sampleRoutesCSV = `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
M1,1,La Défense - Château de Vincennes,1,FFCD00,000000
M4,4,Porte de Clignancourt - Mairie de Montrouge,1,A0006E,FFFFFF
BUS42,42,Gare du Nord - Porte de Versailles,3,00AA55,FFFFFF`;

export const sampleTripsCSV = `trip_id,route_id,service_id,trip_headsign,direction_id
TRIP1,M1,WD,Château de Vincennes,0
TRIP2,M1,WD,La Défense,1`;

export const sampleStopTimesCSV = `trip_id,stop_id,arrival_time,departure_time,stop_sequence
TRIP1,DEFENSE,08:00:00,08:00:30,1
TRIP1,ETOILE,08:05:00,08:05:30,2
TRIP1,CONC,08:08:00,08:08:30,3
TRIP1,CHAT,08:12:00,08:12:30,4`;

/**
 * Test the GTFS parser with sample data
 */
export function testGTFSParser() {
  console.log('🧪 Testing GTFS Parser...');

  // Parse stops
  const stopsResult = parseStops(sampleStopsCSV);
  console.log(`✅ Parsed ${stopsResult.data.length} stops`);

  // Parse routes
  const routesResult = parseRoutes(sampleRoutesCSV);
  console.log(`✅ Parsed ${routesResult.data.length} routes`);

  // Parse all files
  const gtfsData = parseGTFS({
    stops: sampleStopsCSV,
    routes: sampleRoutesCSV,
    trips: sampleTripsCSV,
    stopTimes: sampleStopTimesCSV,
  });

  console.log(`✅ Total stops: ${gtfsData.data.stops.length}`);
  console.log(`✅ Total routes: ${gtfsData.data.routes.length}`);
  console.log(`✅ Total trips: ${gtfsData.data.trips.length}`);
  console.log(`✅ Total stop times: ${gtfsData.data.stopTimes.length}`);

  return gtfsData;
}
