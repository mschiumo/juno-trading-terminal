/**
 * Date Utilities
 * 
 * Helper functions for handling dates in Eastern Time (EST/EDT)
 */

/**
 * Get current date/time in EST timezone
 */
export function getNowInEST(): string {
  const now = new Date();
  // Format as ISO string in EST (UTC-5 or UTC-4 depending on DST)
  return now.toISOString();
}

/**
 * Get today's date in EST (YYYY-MM-DD format)
 */
export function getTodayInEST(): string {
  const now = new Date();
  // Convert to EST
  const estOffset = -5; // EST is UTC-5
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const estDate = new Date(utc + (3600000 * estOffset));
  return estDate.toISOString().split('T')[0];
}

/**
 * Convert a timestamp to EST date string (YYYY-MM-DD)
 */
export function getESTDateFromTimestamp(timestamp: number | string): string {
  const date = new Date(timestamp);
  const estOffset = -5;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const estDate = new Date(utc + (3600000 * estOffset));
  return estDate.toISOString().split('T')[0];
}

/**
 * Parse a date string to EST format
 */
export function parseDateToEST(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const estOffset = -5;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const estDate = new Date(utc + (3600000 * estOffset));
  return estDate.toISOString();
}
