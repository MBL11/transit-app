/**
 * GTFS Data Validation Schemas using Zod
 * Validates GTFS data at runtime to prevent crashes from malformed data
 */

import { z } from 'zod';

/**
 * GTFS Time Format: HH:MM:SS (24-hour format, can exceed 24 hours for next-day trips)
 * Examples: "08:30:00", "25:15:00" (1:15 AM next day)
 */
export const GTFSTimeSchema = z.string().regex(
  /^\d{1,2}:\d{2}:\d{2}$/,
  'Invalid GTFS time format (must be HH:MM:SS)'
);

/**
 * GTFS Color Format: 6-character hex code WITHOUT the # prefix
 * Examples: "FF0000", "00FF00", "FFFFFF"
 */
export const GTFSColorSchema = z.string().regex(
  /^[0-9A-Fa-f]{6}$/,
  'Invalid GTFS color format (must be 6-digit hex without #)'
).optional();

/**
 * GTFS Date Format: YYYYMMDD
 * Example: "20250121"
 */
export const GTFSDateSchema = z.string().regex(
  /^\d{8}$/,
  'Invalid GTFS date format (must be YYYYMMDD)'
);

/**
 * Latitude: -90 to 90
 */
export const LatitudeSchema = z.number().min(-90).max(90);

/**
 * Longitude: -180 to 180
 */
export const LongitudeSchema = z.number().min(-180).max(180);

/**
 * Stop Schema
 */
export const StopSchema = z.object({
  stop_id: z.string().min(1, 'stop_id is required'),
  stop_name: z.string().min(1, 'stop_name is required'),
  stop_lat: LatitudeSchema,
  stop_lon: LongitudeSchema,
  location_type: z.number().int().min(0).max(4).optional(),
  parent_station: z.string().optional(),
  stop_code: z.string().optional(),
  stop_desc: z.string().optional(),
  zone_id: z.string().optional(),
  stop_url: z.string().url().optional(),
  stop_timezone: z.string().optional(),
  wheelchair_boarding: z.number().int().min(0).max(2).optional(),
  level_id: z.string().optional(),
  platform_code: z.string().optional(),
});

export type ValidatedStop = z.infer<typeof StopSchema>;

/**
 * Route Schema
 */
export const RouteSchema = z.object({
  route_id: z.string().min(1, 'route_id is required'),
  route_short_name: z.string().optional(),
  route_long_name: z.string().optional(),
  route_type: z.number().int().min(0).max(12),
  route_color: GTFSColorSchema,
  route_text_color: GTFSColorSchema,
  agency_id: z.string().optional(),
  route_desc: z.string().optional(),
  route_url: z.string().url().optional(),
  route_sort_order: z.number().int().optional(),
}).refine(
  (data) => data.route_short_name || data.route_long_name,
  'Either route_short_name or route_long_name must be provided'
);

export type ValidatedRoute = z.infer<typeof RouteSchema>;

/**
 * Trip Schema
 */
export const TripSchema = z.object({
  trip_id: z.string().min(1, 'trip_id is required'),
  route_id: z.string().min(1, 'route_id is required'),
  service_id: z.string().min(1, 'service_id is required'),
  trip_headsign: z.string().optional(),
  trip_short_name: z.string().optional(),
  direction_id: z.number().int().min(0).max(1).optional(),
  block_id: z.string().optional(),
  shape_id: z.string().optional(),
  wheelchair_accessible: z.number().int().min(0).max(2).optional(),
  bikes_allowed: z.number().int().min(0).max(2).optional(),
});

export type ValidatedTrip = z.infer<typeof TripSchema>;

/**
 * Stop Time Schema
 */
export const StopTimeSchema = z.object({
  trip_id: z.string().min(1, 'trip_id is required'),
  arrival_time: GTFSTimeSchema,
  departure_time: GTFSTimeSchema,
  stop_id: z.string().min(1, 'stop_id is required'),
  stop_sequence: z.number().int().min(0),
  stop_headsign: z.string().optional(),
  pickup_type: z.number().int().min(0).max(3).optional(),
  drop_off_type: z.number().int().min(0).max(3).optional(),
  shape_dist_traveled: z.number().optional(),
  timepoint: z.number().int().min(0).max(1).optional(),
});

export type ValidatedStopTime = z.infer<typeof StopTimeSchema>;

/**
 * Shape Schema
 */
export const ShapeSchema = z.object({
  shape_id: z.string().min(1, 'shape_id is required'),
  shape_pt_lat: LatitudeSchema,
  shape_pt_lon: LongitudeSchema,
  shape_pt_sequence: z.number().int().min(0),
  shape_dist_traveled: z.number().optional(),
});

export type ValidatedShape = z.infer<typeof ShapeSchema>;

/**
 * Helper function to validate and sanitize data
 * Returns validated data or null if validation fails
 */
export function validateGTFSData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Validation] Failed to validate ${context || 'data'}:`, error.errors);
      // Log first error for debugging
      if (error.errors.length > 0) {
        const firstError = error.errors[0];
        console.error(
          `[Validation] ${firstError.path.join('.')}: ${firstError.message}`
        );
      }
    } else {
      console.error(`[Validation] Unexpected error validating ${context || 'data'}:`, error);
    }
    return null;
  }
}

/**
 * Helper function to validate array of GTFS data
 * Filters out invalid entries and returns only valid data
 */
export function validateGTFSArray<T>(
  schema: z.ZodSchema<T>,
  data: unknown[],
  context?: string
): T[] {
  const validated: T[] = [];
  let errorCount = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    try {
      const validatedItem = schema.parse(item);
      validated.push(validatedItem);
    } catch (error) {
      errorCount++;
      if (__DEV__ && errorCount <= 5) {
        // Only log first 5 errors to avoid spam
        console.warn(
          `[Validation] Skipping invalid ${context || 'item'} at index ${i}:`,
          error instanceof z.ZodError ? error.errors[0]?.message : error
        );
      }
    }
  }

  if (errorCount > 0) {
    console.warn(
      `[Validation] Skipped ${errorCount}/${data.length} invalid ${context || 'items'}`
    );
  }

  return validated;
}

/**
 * Helper to parse GTFS time to minutes since midnight
 * Handles times > 24:00:00 for next-day trips
 */
export function parseGTFSTime(timeStr: string): number | null {
  const result = GTFSTimeSchema.safeParse(timeStr);
  if (!result.success) {
    return null;
  }

  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return null;
  }

  return hours * 60 + minutes + seconds / 60;
}

/**
 * Helper to parse GTFS color to hex format with #
 */
export function parseGTFSColor(colorStr: string | undefined): string | undefined {
  if (!colorStr) return undefined;

  const result = GTFSColorSchema.safeParse(colorStr);
  if (!result.success) {
    console.warn(`[Validation] Invalid color: ${colorStr}`);
    return undefined;
  }

  return `#${colorStr}`;
}
