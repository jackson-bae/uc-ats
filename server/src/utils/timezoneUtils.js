import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { parse } from 'date-fns';

// Hardcoded timezone for Los Angeles (handles PST/PDT automatically)
const TIMEZONE = 'America/Los_Angeles';

/**
 * Convert a datetime-local string (YYYY-MM-DDTHH:MM) to UTC Date
 * Treats input as Los Angeles time, handles PST/PDT automatically
 *
 * @param {string} dateTimeString - Format: "YYYY-MM-DDTHH:MM"
 * @returns {Date} UTC Date object
 */
export function localInputToUTC(dateTimeString) {
  if (!dateTimeString) return null;

  // Parse the datetime-local string as LA time
  const [datePart, timePart] = dateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Create a date string that date-fns-tz can parse
  // Format: "2026-03-15 14:30"
  const localDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Parse as LA time and convert to UTC
  const parsed = parse(localDateStr, 'yyyy-MM-dd HH:mm', new Date());
  const utcDate = zonedTimeToUtc(parsed, TIMEZONE);

  return utcDate;
}

/**
 * Format a UTC date for display in Los Angeles time
 *
 * @param {Date|string} date - UTC date
 * @param {string} formatString - date-fns format string
 * @returns {string} Formatted date in LA timezone
 */
export function formatInLA(date, formatString) {
  if (!date) return '';
  const utcDate = date instanceof Date ? date : new Date(date);
  return formatInTimeZone(utcDate, TIMEZONE, formatString);
}

/**
 * Format date for email display (long format with time)
 * Example: "Monday, March 15, 2026, 2:30 PM"
 *
 * @param {Date|string} date - UTC date
 * @returns {string} Formatted date string
 */
export function formatEmailDateTime(date) {
  if (!date) return '';
  return formatInLA(date, 'EEEE, MMMM d, yyyy, h:mm a');
}

/**
 * Format time only for email display
 * Example: "2:30 PM"
 *
 * @param {Date|string} date - UTC date
 * @returns {string} Formatted time string
 */
export function formatEmailTime(date) {
  if (!date) return '';
  return formatInLA(date, 'h:mm a');
}

export { TIMEZONE };
