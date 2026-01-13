/**
 * Raw GTFS data types
 * These represent the structure of GTFS CSV files
 * https://gtfs.org/schedule/reference/
 */

/**
 * Raw GTFS Stop from stops.txt
 */
export interface GTFSStop {
  stop_id: string;
  stop_code?: string;
  stop_name: string;
  stop_desc?: string;
  stop_lat: string; // CSV returns strings, need to parse
  stop_lon: string;
  zone_id?: string;
  stop_url?: string;
  location_type?: string; // 0=stop, 1=station, 2=entrance, 3=generic node, 4=boarding area
  parent_station?: string;
  stop_timezone?: string;
  wheelchair_boarding?: string;
  level_id?: string;
  platform_code?: string;
}

/**
 * Raw GTFS Route from routes.txt
 */
export interface GTFSRoute {
  route_id: string;
  agency_id?: string;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string;
  route_type: string; // 0=tram, 1=metro, 2=rail, 3=bus, etc.
  route_url?: string;
  route_color?: string;
  route_text_color?: string;
  route_sort_order?: string;
  continuous_pickup?: string;
  continuous_drop_off?: string;
}

/**
 * Raw GTFS Trip from trips.txt
 */
export interface GTFSTrip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: string; // 0 or 1
  block_id?: string;
  shape_id?: string;
  wheelchair_accessible?: string;
  bikes_allowed?: string;
}

/**
 * Raw GTFS StopTime from stop_times.txt
 */
export interface GTFSStopTime {
  trip_id: string;
  arrival_time: string; // HH:MM:SS format
  departure_time: string;
  stop_id: string;
  stop_sequence: string; // CSV returns strings
  stop_headsign?: string;
  pickup_type?: string;
  drop_off_type?: string;
  continuous_pickup?: string;
  continuous_drop_off?: string;
  shape_dist_traveled?: string;
  timepoint?: string;
}

/**
 * Raw GTFS Shape from shapes.txt (optional)
 */
export interface GTFSShape {
  shape_id: string;
  shape_pt_lat: string;
  shape_pt_lon: string;
  shape_pt_sequence: string;
  shape_dist_traveled?: string;
}

/**
 * Raw GTFS Agency from agency.txt
 */
export interface GTFSAgency {
  agency_id?: string;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
  agency_lang?: string;
  agency_phone?: string;
  agency_fare_url?: string;
  agency_email?: string;
}

/**
 * Raw GTFS Calendar from calendar.txt
 */
export interface GTFSCalendar {
  service_id: string;
  monday: string; // 0 or 1
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  start_date: string; // YYYYMMDD
  end_date: string;
}

/**
 * Raw GTFS Calendar Date from calendar_dates.txt
 */
export interface GTFSCalendarDate {
  service_id: string;
  date: string; // YYYYMMDD
  exception_type: string; // 1=added, 2=removed
}

/**
 * Parsed GTFS feed containing all data
 */
export interface GTFSFeed {
  stops: GTFSStop[];
  routes: GTFSRoute[];
  trips: GTFSTrip[];
  stopTimes: GTFSStopTime[];
  shapes?: GTFSShape[];
  agencies?: GTFSAgency[];
  calendar?: GTFSCalendar[];
  calendarDates?: GTFSCalendarDate[];
}
