/**
 * GTFS Parser Unit Tests
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
} from '../gtfs-parser';
import type { GTFSStop, GTFSRoute, GTFSTrip, GTFSStopTime } from '../types/gtfs';

// Sample CSV data
const SAMPLE_STOPS_CSV = `stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station
STOP001,Gare du Nord,48.8809,2.3553,0,
STOP002,Châtelet,48.8584,2.3470,0,
STOP003,République,48.8673,2.3636,1,PARENT001`;

const SAMPLE_ROUTES_CSV = `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
ROUTE001,1,Métro Ligne 1,1,FFCD00,000000
ROUTE002,14,Métro Ligne 14,1,62259D,FFFFFF
ROUTE003,91,Bus 91,3,,`;

const SAMPLE_TRIPS_CSV = `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
ROUTE001,SERVICE1,TRIP001,La Défense,0,SHAPE001
ROUTE001,SERVICE1,TRIP002,Château de Vincennes,1,SHAPE002
ROUTE002,SERVICE1,TRIP003,,0,`;

const SAMPLE_STOP_TIMES_CSV = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
TRIP001,08:00:00,08:00:30,STOP001,1
TRIP001,08:05:00,08:05:00,STOP002,2
TRIP001,25:10:00,25:10:00,STOP003,3`;

// Invalid data for testing validation
const INVALID_STOPS_CSV = `stop_id,stop_name,stop_lat,stop_lon,location_type
STOP001,Invalid Stop,999,999,0`;

const EMPTY_CSV = `stop_id,stop_name,stop_lat,stop_lon
`;

describe('GTFS Parser', () => {
  describe('parseStops', () => {
    it('should parse valid stops CSV', () => {
      const stops = parseStops(SAMPLE_STOPS_CSV);

      expect(stops).toHaveLength(3);
      expect(stops[0].stop_id).toBe('STOP001');
      expect(stops[0].stop_name).toBe('Gare du Nord');
      expect(stops[0].stop_lat).toBe('48.8809');
      expect(stops[0].stop_lon).toBe('2.3553');
    });

    it('should handle parent_station field', () => {
      const stops = parseStops(SAMPLE_STOPS_CSV);

      expect(stops[2].parent_station).toBe('PARENT001');
      expect(stops[0].parent_station).toBe('');
    });

    it('should handle empty CSV', () => {
      const stops = parseStops(EMPTY_CSV);
      expect(stops).toHaveLength(0);
    });

    it('should handle CSV with only headers', () => {
      const stops = parseStops('stop_id,stop_name,stop_lat,stop_lon\n');
      expect(stops).toHaveLength(0);
    });
  });

  describe('parseRoutes', () => {
    it('should parse valid routes CSV', () => {
      const routes = parseRoutes(SAMPLE_ROUTES_CSV);

      expect(routes).toHaveLength(3);
      expect(routes[0].route_id).toBe('ROUTE001');
      expect(routes[0].route_short_name).toBe('1');
      expect(routes[0].route_type).toBe('1');
      expect(routes[0].route_color).toBe('FFCD00');
    });

    it('should handle missing optional fields', () => {
      const routes = parseRoutes(SAMPLE_ROUTES_CSV);

      // Route 3 has no color
      expect(routes[2].route_color).toBe('');
    });
  });

  describe('parseTrips', () => {
    it('should parse valid trips CSV', () => {
      const trips = parseTrips(SAMPLE_TRIPS_CSV);

      expect(trips).toHaveLength(3);
      expect(trips[0].trip_id).toBe('TRIP001');
      expect(trips[0].route_id).toBe('ROUTE001');
      expect(trips[0].trip_headsign).toBe('La Défense');
      expect(trips[0].direction_id).toBe('0');
    });

    it('should handle missing headsign', () => {
      const trips = parseTrips(SAMPLE_TRIPS_CSV);

      expect(trips[2].trip_headsign).toBe('');
    });
  });

  describe('parseStopTimes', () => {
    it('should parse valid stop_times CSV', () => {
      const stopTimes = parseStopTimes(SAMPLE_STOP_TIMES_CSV);

      expect(stopTimes).toHaveLength(3);
      expect(stopTimes[0].trip_id).toBe('TRIP001');
      expect(stopTimes[0].arrival_time).toBe('08:00:00');
      expect(stopTimes[0].departure_time).toBe('08:00:30');
      expect(stopTimes[0].stop_sequence).toBe('1');
    });

    it('should handle times > 24:00 (next day)', () => {
      const stopTimes = parseStopTimes(SAMPLE_STOP_TIMES_CSV);

      // GTFS allows times > 24:00 for trips crossing midnight
      expect(stopTimes[2].arrival_time).toBe('25:10:00');
    });
  });

  describe('normalizeStop', () => {
    it('should convert GTFSStop to Stop model', () => {
      // Use İzmir coordinates (within İzmir bounding box) to avoid coordinate correction
      const gtfsStop: GTFSStop = {
        stop_id: 'STOP001',
        stop_name: 'Konak',
        stop_lat: '38.4189',
        stop_lon: '27.1287',
        location_type: '0',
        parent_station: '',
      };

      const stop = normalizeStop(gtfsStop);

      expect(stop.id).toBe('STOP001');
      expect(stop.name).toBe('Konak');
      expect(stop.lat).toBe(38.4189);
      expect(stop.lon).toBe(27.1287);
      expect(stop.locationType).toBe(0);
      expect(stop.parentStation).toBeUndefined();
    });

    it('should handle parent station', () => {
      const gtfsStop: GTFSStop = {
        stop_id: 'STOP003',
        stop_name: 'République',
        stop_lat: '48.8673',
        stop_lon: '2.3636',
        location_type: '1',
        parent_station: 'PARENT001',
      };

      const stop = normalizeStop(gtfsStop);

      expect(stop.locationType).toBe(1);
      expect(stop.parentStation).toBe('PARENT001');
    });

    it('should handle missing location_type', () => {
      const gtfsStop: GTFSStop = {
        stop_id: 'STOP001',
        stop_name: 'Test',
        stop_lat: '48.0',
        stop_lon: '2.0',
        location_type: '',
        parent_station: '',
      };

      const stop = normalizeStop(gtfsStop);
      expect(stop.locationType).toBe(0);
    });
  });

  describe('normalizeRoute', () => {
    it('should convert GTFSRoute to Route model', () => {
      const gtfsRoute: GTFSRoute = {
        route_id: 'ROUTE001',
        route_short_name: '1',
        route_long_name: 'Métro Ligne 1',
        route_type: '1',
        route_color: 'FFCD00',
        route_text_color: '000000',
      };

      const route = normalizeRoute(gtfsRoute);

      expect(route.id).toBe('ROUTE001');
      expect(route.shortName).toBe('1');
      expect(route.longName).toBe('Métro Ligne 1');
      expect(route.type).toBe(1);
      expect(route.color).toBe('#FFCD00');
      expect(route.textColor).toBe('#000000');
    });

    it('should add # prefix to colors', () => {
      const gtfsRoute: GTFSRoute = {
        route_id: 'ROUTE001',
        route_short_name: '1',
        route_long_name: 'Test',
        route_type: '1',
        route_color: 'FF0000',
        route_text_color: '00FF00',
      };

      const route = normalizeRoute(gtfsRoute);

      expect(route.color).toBe('#FF0000');
      expect(route.textColor).toBe('#00FF00');
    });

    it('should use default colors when missing', () => {
      const gtfsRoute: GTFSRoute = {
        route_id: 'ROUTE001',
        route_short_name: '1',
        route_long_name: 'Test',
        route_type: '3',
        route_color: '',
        route_text_color: '',
      };

      const route = normalizeRoute(gtfsRoute);

      // İzmir bus fallback color is #0066CC (blue)
      expect(route.color).toBe('#0066CC');
      expect(route.textColor).toBe('#FFFFFF');
    });
  });

  describe('normalizeTrip', () => {
    it('should convert GTFSTrip to Trip model', () => {
      const gtfsTrip: GTFSTrip = {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'SERVICE1',
        trip_headsign: 'La Défense',
        direction_id: '0',
        shape_id: 'SHAPE001',
      };

      const trip = normalizeTrip(gtfsTrip);

      expect(trip.id).toBe('TRIP001');
      expect(trip.routeId).toBe('ROUTE001');
      expect(trip.serviceId).toBe('SERVICE1');
      expect(trip.headsign).toBe('La Défense');
      expect(trip.directionId).toBe(0);
      expect(trip.shapeId).toBe('SHAPE001');
    });

    it('should handle missing optional fields', () => {
      const gtfsTrip: GTFSTrip = {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'SERVICE1',
        trip_headsign: '',
        direction_id: '',
        shape_id: '',
      };

      const trip = normalizeTrip(gtfsTrip);

      expect(trip.headsign).toBeUndefined();
      expect(trip.directionId).toBe(0);
      expect(trip.shapeId).toBeUndefined();
    });
  });

  describe('normalizeStopTime', () => {
    it('should convert GTFSStopTime to StopTime model', () => {
      const gtfsStopTime: GTFSStopTime = {
        trip_id: 'TRIP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:30',
        stop_id: 'STOP001',
        stop_sequence: '1',
      };

      const stopTime = normalizeStopTime(gtfsStopTime);

      expect(stopTime.tripId).toBe('TRIP001');
      expect(stopTime.arrivalTime).toBe('08:00:00');
      expect(stopTime.departureTime).toBe('08:00:30');
      expect(stopTime.stopId).toBe('STOP001');
      expect(stopTime.stopSequence).toBe(1);
    });
  });

  describe('parseGTFSFeed', () => {
    it('should parse complete GTFS feed', () => {
      const data = parseGTFSFeed({
        stops: SAMPLE_STOPS_CSV,
        routes: SAMPLE_ROUTES_CSV,
        trips: SAMPLE_TRIPS_CSV,
        stopTimes: SAMPLE_STOP_TIMES_CSV,
      });

      expect(data.stops).toHaveLength(3);
      expect(data.routes).toHaveLength(3);
      expect(data.trips).toHaveLength(3);
      expect(data.stopTimes).toHaveLength(3);
    });

    it('should normalize all data', () => {
      const data = parseGTFSFeed({
        stops: SAMPLE_STOPS_CSV,
        routes: SAMPLE_ROUTES_CSV,
        trips: SAMPLE_TRIPS_CSV,
        stopTimes: SAMPLE_STOP_TIMES_CSV,
      });

      // Check stops are normalized (lat/lon are numbers)
      expect(typeof data.stops[0].lat).toBe('number');
      expect(typeof data.stops[0].lon).toBe('number');

      // Check routes are normalized (type is number, colors have #)
      expect(typeof data.routes[0].type).toBe('number');
      expect(data.routes[0].color).toMatch(/^#/);

      // Check stop times are normalized (stopSequence is number)
      expect(typeof data.stopTimes[0].stopSequence).toBe('number');
    });
  });

  describe('validateGTFSData', () => {
    it('should validate correct data', () => {
      const data = parseGTFSFeed({
        stops: SAMPLE_STOPS_CSV,
        routes: SAMPLE_ROUTES_CSV,
        trips: SAMPLE_TRIPS_CSV,
        stopTimes: SAMPLE_STOP_TIMES_CSV,
      });

      const result = validateGTFSData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty stops', () => {
      const result = validateGTFSData({
        stops: [],
        routes: [{ id: 'R1', shortName: '1', longName: 'Test', type: 1, color: '#FFF', textColor: '#000' }],
        trips: [{ id: 'T1', routeId: 'R1', serviceId: 'S1', directionId: 0 }],
        stopTimes: [{ tripId: 'T1', arrivalTime: '08:00:00', departureTime: '08:00:00', stopId: 'S1', stopSequence: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No stops found');
    });

    it('should detect empty routes', () => {
      const result = validateGTFSData({
        stops: [{ id: 'S1', name: 'Test', lat: 48.0, lon: 2.0, locationType: 0 }],
        routes: [],
        trips: [{ id: 'T1', routeId: 'R1', serviceId: 'S1', directionId: 0 }],
        stopTimes: [{ tripId: 'T1', arrivalTime: '08:00:00', departureTime: '08:00:00', stopId: 'S1', stopSequence: 1 }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No routes found');
    });

    it('should detect invalid coordinates', () => {
      // When some stops have valid coords, validation passes with warnings (not errors)
      const resultPartial = validateGTFSData({
        stops: [
          { id: 'S1', name: 'Valid', lat: 48.0, lon: 2.0, locationType: 0 },
          { id: 'S2', name: 'Invalid lat', lat: 999, lon: 2.0, locationType: 0 },
          { id: 'S3', name: 'Invalid lon', lat: 48.0, lon: -999, locationType: 0 },
        ],
        routes: [{ id: 'R1', shortName: '1', longName: 'Test', type: 1, color: '#FFF', textColor: '#000' }],
        trips: [{ id: 'T1', routeId: 'R1', serviceId: 'S1', directionId: 0 }],
        stopTimes: [{ tripId: 'T1', arrivalTime: '08:00:00', departureTime: '08:00:00', stopId: 'S1', stopSequence: 1 }],
      });

      // isValid is true because at least 1 stop has valid coords (warns instead of errors)
      expect(resultPartial.isValid).toBe(true);
      expect(resultPartial.warnings.some(w => w.includes('invalid coordinates'))).toBe(true);

      // When ALL stops have invalid coords, isValid should be false
      const resultAll = validateGTFSData({
        stops: [
          { id: 'S2', name: 'Invalid lat', lat: 999, lon: 2.0, locationType: 0 },
          { id: 'S3', name: 'Invalid lon', lat: 48.0, lon: -999, locationType: 0 },
        ],
        routes: [{ id: 'R1', shortName: '1', longName: 'Test', type: 1, color: '#FFF', textColor: '#000' }],
        trips: [{ id: 'T1', routeId: 'R1', serviceId: 'S1', directionId: 0 }],
        stopTimes: [{ tripId: 'T1', arrivalTime: '08:00:00', departureTime: '08:00:00', stopId: 'S1', stopSequence: 1 }],
      });

      expect(resultAll.isValid).toBe(false);
      expect(resultAll.errors.some(e => e.includes('invalid coordinates'))).toBe(true);
    });

    it('should detect NaN coordinates', () => {
      const result = validateGTFSData({
        stops: [
          { id: 'S1', name: 'NaN coords', lat: NaN, lon: NaN, locationType: 0 },
        ],
        routes: [{ id: 'R1', shortName: '1', longName: 'Test', type: 1, color: '#FFF', textColor: '#000' }],
        trips: [{ id: 'T1', routeId: 'R1', serviceId: 'S1', directionId: 0 }],
        stopTimes: [{ tripId: 'T1', arrivalTime: '08:00:00', departureTime: '08:00:00', stopId: 'S1', stopSequence: 1 }],
      });

      expect(result.isValid).toBe(false);
    });
  });
});
