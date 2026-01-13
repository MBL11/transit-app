import Papa from 'papaparse';
import type {
  Stop,
  Route,
  Trip,
  StopTime,
  Shape,
  Calendar,
  CalendarDate,
  Agency,
  GTFSData,
  RouteType,
} from './types/gtfs';

/**
 * Parser options
 */
export interface GTFSParserOptions {
  encoding?: string; // Default: 'utf-8'
  skipEmptyLines?: boolean; // Default: true
  trimHeaders?: boolean; // Default: true
}

/**
 * Parse result with data and errors
 */
export interface ParseResult<T> {
  data: T[];
  errors: Papa.ParseError[];
}

/**
 * Parse CSV content to typed objects
 */
function parseCSV<T>(
  csvContent: string,
  options: GTFSParserOptions = {}
): ParseResult<T> {
  const { skipEmptyLines = true, trimHeaders = true } = options;

  const result = Papa.parse<T>(csvContent, {
    header: true,
    skipEmptyLines,
    trimHeaders,
    transformHeader: (header) => (trimHeaders ? header.trim() : header),
    transform: (value) => value.trim(),
  });

  return {
    data: result.data,
    errors: result.errors,
  };
}

/**
 * Parse stops.txt
 */
export function parseStops(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<Stop> {
  const result = parseCSV<any>(csvContent, options);

  const stops: Stop[] = result.data.map((row) => ({
    stop_id: row.stop_id,
    stop_name: row.stop_name,
    stop_lat: parseFloat(row.stop_lat),
    stop_lon: parseFloat(row.stop_lon),
    stop_code: row.stop_code || undefined,
    stop_desc: row.stop_desc || undefined,
    location_type: row.location_type ? parseInt(row.location_type) : undefined,
    parent_station: row.parent_station || undefined,
    wheelchair_boarding: row.wheelchair_boarding
      ? parseInt(row.wheelchair_boarding)
      : undefined,
    platform_code: row.platform_code || undefined,
  }));

  return { data: stops, errors: result.errors };
}

/**
 * Parse routes.txt
 */
export function parseRoutes(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<Route> {
  const result = parseCSV<any>(csvContent, options);

  const routes: Route[] = result.data.map((row) => ({
    route_id: row.route_id,
    route_short_name: row.route_short_name,
    route_long_name: row.route_long_name,
    route_type: parseInt(row.route_type) as RouteType,
    route_color: row.route_color || undefined,
    route_text_color: row.route_text_color || undefined,
    route_desc: row.route_desc || undefined,
    agency_id: row.agency_id || undefined,
  }));

  return { data: routes, errors: result.errors };
}

/**
 * Parse trips.txt
 */
export function parseTrips(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<Trip> {
  const result = parseCSV<any>(csvContent, options);

  const trips: Trip[] = result.data.map((row) => ({
    trip_id: row.trip_id,
    route_id: row.route_id,
    service_id: row.service_id,
    trip_headsign: row.trip_headsign || undefined,
    trip_short_name: row.trip_short_name || undefined,
    direction_id: row.direction_id ? parseInt(row.direction_id) : undefined,
    block_id: row.block_id || undefined,
    shape_id: row.shape_id || undefined,
    wheelchair_accessible: row.wheelchair_accessible
      ? parseInt(row.wheelchair_accessible)
      : undefined,
    bikes_allowed: row.bikes_allowed ? parseInt(row.bikes_allowed) : undefined,
  }));

  return { data: trips, errors: result.errors };
}

/**
 * Parse stop_times.txt
 */
export function parseStopTimes(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<StopTime> {
  const result = parseCSV<any>(csvContent, options);

  const stopTimes: StopTime[] = result.data.map((row) => ({
    trip_id: row.trip_id,
    stop_id: row.stop_id,
    arrival_time: row.arrival_time,
    departure_time: row.departure_time,
    stop_sequence: parseInt(row.stop_sequence),
    stop_headsign: row.stop_headsign || undefined,
    pickup_type: row.pickup_type ? parseInt(row.pickup_type) : undefined,
    drop_off_type: row.drop_off_type ? parseInt(row.drop_off_type) : undefined,
    shape_dist_traveled: row.shape_dist_traveled
      ? parseFloat(row.shape_dist_traveled)
      : undefined,
    timepoint: row.timepoint ? parseInt(row.timepoint) : undefined,
  }));

  return { data: stopTimes, errors: result.errors };
}

/**
 * Parse shapes.txt (optional)
 */
export function parseShapes(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<Shape> {
  const result = parseCSV<any>(csvContent, options);

  const shapes: Shape[] = result.data.map((row) => ({
    shape_id: row.shape_id,
    shape_pt_lat: parseFloat(row.shape_pt_lat),
    shape_pt_lon: parseFloat(row.shape_pt_lon),
    shape_pt_sequence: parseInt(row.shape_pt_sequence),
    shape_dist_traveled: row.shape_dist_traveled
      ? parseFloat(row.shape_dist_traveled)
      : undefined,
  }));

  return { data: shapes, errors: result.errors };
}

/**
 * Parse calendar.txt (optional)
 */
export function parseCalendar(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<Calendar> {
  const result = parseCSV<any>(csvContent, options);

  const calendars: Calendar[] = result.data.map((row) => ({
    service_id: row.service_id,
    monday: parseInt(row.monday),
    tuesday: parseInt(row.tuesday),
    wednesday: parseInt(row.wednesday),
    thursday: parseInt(row.thursday),
    friday: parseInt(row.friday),
    saturday: parseInt(row.saturday),
    sunday: parseInt(row.sunday),
    start_date: row.start_date,
    end_date: row.end_date,
  }));

  return { data: calendars, errors: result.errors };
}

/**
 * Parse calendar_dates.txt (optional)
 */
export function parseCalendarDates(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<CalendarDate> {
  const result = parseCSV<any>(csvContent, options);

  const calendarDates: CalendarDate[] = result.data.map((row) => ({
    service_id: row.service_id,
    date: row.date,
    exception_type: parseInt(row.exception_type),
  }));

  return { data: calendarDates, errors: result.errors };
}

/**
 * Parse agency.txt (optional)
 */
export function parseAgency(
  csvContent: string,
  options?: GTFSParserOptions
): ParseResult<Agency> {
  const result = parseCSV<any>(csvContent, options);

  const agencies: Agency[] = result.data.map((row) => ({
    agency_id: row.agency_id || undefined,
    agency_name: row.agency_name,
    agency_url: row.agency_url,
    agency_timezone: row.agency_timezone,
    agency_lang: row.agency_lang || undefined,
    agency_phone: row.agency_phone || undefined,
    agency_fare_url: row.agency_fare_url || undefined,
    agency_email: row.agency_email || undefined,
  }));

  return { data: agencies, errors: result.errors };
}

/**
 * Parse multiple GTFS files at once
 */
export interface GTFSFiles {
  stops: string;
  routes: string;
  trips: string;
  stopTimes: string;
  shapes?: string;
  calendar?: string;
  calendarDates?: string;
  agency?: string;
}

/**
 * Parse all GTFS files and return structured data
 */
export function parseGTFS(
  files: GTFSFiles,
  options?: GTFSParserOptions
): {
  data: GTFSData;
  errors: { [key: string]: Papa.ParseError[] };
} {
  const errors: { [key: string]: Papa.ParseError[] } = {};

  // Parse required files
  const stopsResult = parseStops(files.stops, options);
  if (stopsResult.errors.length > 0) errors.stops = stopsResult.errors;

  const routesResult = parseRoutes(files.routes, options);
  if (routesResult.errors.length > 0) errors.routes = routesResult.errors;

  const tripsResult = parseTrips(files.trips, options);
  if (tripsResult.errors.length > 0) errors.trips = tripsResult.errors;

  const stopTimesResult = parseStopTimes(files.stopTimes, options);
  if (stopTimesResult.errors.length > 0)
    errors.stopTimes = stopTimesResult.errors;

  // Parse optional files
  let shapesResult: ParseResult<Shape> | undefined;
  if (files.shapes) {
    shapesResult = parseShapes(files.shapes, options);
    if (shapesResult.errors.length > 0) errors.shapes = shapesResult.errors;
  }

  let calendarResult: ParseResult<Calendar> | undefined;
  if (files.calendar) {
    calendarResult = parseCalendar(files.calendar, options);
    if (calendarResult.errors.length > 0)
      errors.calendar = calendarResult.errors;
  }

  let calendarDatesResult: ParseResult<CalendarDate> | undefined;
  if (files.calendarDates) {
    calendarDatesResult = parseCalendarDates(files.calendarDates, options);
    if (calendarDatesResult.errors.length > 0)
      errors.calendarDates = calendarDatesResult.errors;
  }

  let agencyResult: ParseResult<Agency> | undefined;
  if (files.agency) {
    agencyResult = parseAgency(files.agency, options);
    if (agencyResult.errors.length > 0) errors.agency = agencyResult.errors;
  }

  return {
    data: {
      stops: stopsResult.data,
      routes: routesResult.data,
      trips: tripsResult.data,
      stopTimes: stopTimesResult.data,
      shapes: shapesResult?.data,
      calendar: calendarResult?.data,
      calendarDates: calendarDatesResult?.data,
      agencies: agencyResult?.data,
    },
    errors,
  };
}
