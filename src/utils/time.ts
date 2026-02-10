// İzmir timezone offset: UTC+3 (Turkey doesn't observe DST since 2016)
const IZMIR_TIMEZONE_OFFSET = 3 * 60; // +3 hours in minutes

/**
 * Get İzmir local time components from any Date object
 * This is essential because GTFS times are in İzmir local time
 */
export function getIzmirTime(date: Date): { hours: number; minutes: number; totalMinutes: number } {
  // Get UTC time
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();

  // Convert to İzmir time (UTC+3)
  let izmirTotalMinutes = utcHours * 60 + utcMinutes + IZMIR_TIMEZONE_OFFSET;

  // Handle day overflow
  if (izmirTotalMinutes >= 24 * 60) {
    izmirTotalMinutes -= 24 * 60;
  }
  if (izmirTotalMinutes < 0) {
    izmirTotalMinutes += 24 * 60;
  }

  const hours = Math.floor(izmirTotalMinutes / 60);
  const minutes = izmirTotalMinutes % 60;

  return { hours, minutes, totalMinutes: izmirTotalMinutes };
}

/**
 * Create a Date object representing İzmir local time
 * Useful for displaying times correctly regardless of device timezone
 */
export function toIzmirDate(date: Date): Date {
  // Create a new date adjusted to İzmir timezone
  const utcTime = date.getTime();
  const deviceOffset = date.getTimezoneOffset() * 60000; // Device offset in ms
  const izmirOffset = -IZMIR_TIMEZONE_OFFSET * 60000; // İzmir offset in ms (negative because getTimezoneOffset returns inverted)

  return new Date(utcTime + deviceOffset + (-izmirOffset));
}

/**
 * Format time in İzmir timezone
 */
export function formatIzmirTime(date: Date): string {
  const { hours, minutes } = getIzmirTime(date);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function formatTime(date: Date): string {
  // Retourne "HH:MM" in İzmir time
  return formatIzmirTime(date);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin <= 0) return 'Maintenant';
  if (diffMin < 60) return `dans ${diffMin} min`;

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `dans ${hours}h`;
  return `dans ${hours}h${mins}`;
}

/**
 * Convert İzmir local time (minutes since midnight) to a proper Date object.
 * This is crucial because GTFS times are in İzmir local time (UTC+3),
 * and we need to create Date objects that represent the correct moment in time.
 *
 * @param baseDate - A reference date (the İzmir date/time context for GTFS lookup)
 * @param izmirMinutes - Minutes since midnight in İzmir time (0-1439, or >1440 for next day)
 * @returns Date object representing that İzmir time
 */
export function izmirMinutesToDate(baseDate: Date, izmirMinutes: number): Date {
  // First, get the İzmir date components from baseDate
  // This is important: if user selects 22:00 France time on Feb 10,
  // that's 00:00 İzmir time on Feb 11, so we need Feb 11 as the base İzmir date
  const baseIzmirTime = getIzmirTime(baseDate);
  const baseUtcMs = baseDate.getTime();

  // Calculate the start of the İzmir day (midnight İzmir time)
  // by going back from current İzmir time to midnight
  const msFromMidnight = baseIzmirTime.totalMinutes * 60000;
  const izmirMidnightUtcMs = baseUtcMs - msFromMidnight;

  // Handle times past midnight (GTFS can have times like 25:30 for 01:30 next day)
  let dayOffset = 0;
  let normalizedMinutes = izmirMinutes;
  while (normalizedMinutes >= 24 * 60) {
    normalizedMinutes -= 24 * 60;
    dayOffset++;
  }

  // Calculate the target İzmir time in milliseconds from İzmir midnight
  const targetMsFromMidnight = normalizedMinutes * 60000;

  // The result is İzmir midnight (in UTC) + target minutes + day offset
  const resultMs = izmirMidnightUtcMs + targetMsFromMidnight + (dayOffset * 24 * 60 * 60000);

  return new Date(resultMs);
}
