import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

// Hardcoded timezone for Los Angeles (handles PST/PDT automatically)
const TIMEZONE = 'America/Los_Angeles';

/**
 * Convert a datetime-local string (YYYY-MM-DDTHH:mm) to a UTC Date
 * Treats input as Los Angeles time
 */
export function localInputToUTC(dateTimeString) {
  if (!dateTimeString) return null;

  // Convert "YYYY-MM-DDTHH:mm" → "YYYY-MM-DD HH:mm"
  const normalized = dateTimeString.replace('T', ' ');

  // Interpret the time as LA time and convert to UTC
  return fromZonedTime(normalized, TIMEZONE);
}

/**
 * Format a UTC date for display in Los Angeles time
 */
export function formatInLA(date, formatString) {
  if (!date) return '';
  const utcDate = date instanceof Date ? date : new Date(date);
  return formatInTimeZone(utcDate, TIMEZONE, formatString);
}

/**
 * Format date for email display
 * Example: "Monday, March 15, 2026, 2:30 PM"
 */
export function formatEmailDateTime(date) {
  if (!date) return '';
  return formatInLA(date, 'EEEE, MMMM d, yyyy, h:mm a');
}

/**
 * Format time only for email display
 * Example: "2:30 PM"
 */
export function formatEmailTime(date) {
  if (!date) return '';
  return formatInLA(date, 'h:mm a');
}

export { TIMEZONE };
