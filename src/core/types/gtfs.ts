/**
 * GTFS (General Transit Feed Specification) TypeScript types
 * Based on https://gtfs.org/reference/static
 */

/**
 * Stop/Station from stops.txt
 */
export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string;
  stop_desc?: string;
  location_type?: number; // 0 = stop, 1 = station, 2 = entrance/exit
  parent_station?: string;
  wheelchair_boarding?: number; // 0 = no info, 1 = accessible, 2 = not accessible
  platform_code?: string;
}

/**
 * Route/Line from routes.txt
 */
export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: RouteType;
  route_color?: string;
  route_text_color?: string;
  route_desc?: string;
  agency_id?: string;
}

/**
 * GTFS Route Types
 */
export enum RouteType {
  Tram = 0,
  Metro = 1,
  Rail = 2,
  Bus = 3,
  Ferry = 4,
  CableTram = 5,
  AerialLift = 6,
  Funicular = 7,
  Trolleybus = 11,
  Monorail = 12,
}

/**
 * Trip from trips.txt
 */
export interface Trip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: number; // 0 or 1
  block_id?: string;
  shape_id?: string;
  wheelchair_accessible?: number;
  bikes_allowed?: number;
}

/**
 * Stop time from stop_times.txt
 */
export interface StopTime {
  trip_id: string;
  stop_id: string;
  arrival_time: string; // Format: HH:MM:SS (can be > 24 hours)
  departure_time: string; // Format: HH:MM:SS
  stop_sequence: number;
  stop_headsign?: string;
  pickup_type?: number; // 0 = regular, 1 = none, 2 = phone agency, 3 = coordinate with driver
  drop_off_type?: number;
  shape_dist_traveled?: number;
  timepoint?: number; // 0 = approximate, 1 = exact
}

/**
 * Shape point from shapes.txt (optional)
 */
export interface Shape {
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
  shape_dist_traveled?: number;
}

/**
 * Calendar service from calendar.txt
 */
export interface Calendar {
  service_id: string;
  monday: number; // 0 or 1
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string; // YYYYMMDD
  end_date: string; // YYYYMMDD
}

/**
 * Calendar exception from calendar_dates.txt
 */
export interface CalendarDate {
  service_id: string;
  date: string; // YYYYMMDD
  exception_type: number; // 1 = service added, 2 = service removed
}

/**
 * Agency from agency.txt
 */
export interface Agency {
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
 * Parsed GTFS data structure
 */
export interface GTFSData {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
  shapes?: Shape[];
  calendar?: Calendar[];
  calendarDates?: CalendarDate[];
  agencies?: Agency[];
}
