/**
 * Date utilities for EST (America/New_York) timezone handling
 * All dates are stored with -05:00 offset to ensure consistency
 */

const EST_TIMEZONE = 'America/New_York';
const EST_OFFSET = '-05:00';

/**
 * Get current date/time in EST as ISO string with -05:00 offset
 * Use this instead of new Date().toISOString() which returns UTC
 */
export function getNowInEST(): string {
  const now = new Date();
  const estDateStr = now.toLocaleString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse MM/DD/YYYY, HH:MM:SS format
  const [datePart, timePart] = estDateStr.split(', ');
  const [month, day, year] = datePart.split('/');
  return `${year}-${month}-${day}T${timePart}${EST_OFFSET}`;
}

/**
 * Get current date in EST as YYYY-MM-DD string
 */
export function getTodayInEST(): string {
  const now = new Date();
  const estDateStr = now.toLocaleDateString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const [month, day, year] = estDateStr.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in EST as HH:MM:SS string
 */
export function getTimeInEST(): string {
  const now = new Date();
  const estTimeStr = now.toLocaleTimeString('en-US', {
    timeZone: EST_TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  return estTimeStr;
}

/**
 * Format a date string to EST ISO string
 */
export function toESTISOString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const estDateStr = d.toLocaleString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const [datePart, timePart] = estDateStr.split(', ');
  const [month, day, year] = datePart.split('/');
  return `${year}-${month}-${day}T${timePart}${EST_OFFSET}`;
}

/**
 * Parse an EST date string to Date object
 */
export function parseESTDate(dateStr: string): Date {
  return new Date(dateStr.replace(EST_OFFSET, ''));
}

/**
 * Check if two dates are the same day in EST
 */
export function isSameDayEST(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const est1 = d1.toLocaleDateString('en-US', { timeZone: EST_TIMEZONE });
  const est2 = d2.toLocaleDateString('en-US', { timeZone: EST_TIMEZONE });
  
  return est1 === est2;
}

/**
 * Get start of day in EST as ISO string
 */
export function getStartOfDayEST(date?: Date): string {
  const d = date || new Date();
  const estDateStr = d.toLocaleDateString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const [month, day, year] = estDateStr.split('/');
  return `${year}-${month}-${day}T00:00:00${EST_OFFSET}`;
}

/**
 * Get end of day in EST as ISO string
 */
export function getEndOfDayEST(date?: Date): string {
  const d = date || new Date();
  const estDateStr = d.toLocaleDateString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const [month, day, year] = estDateStr.split('/');
  return `${year}-${month}-${day}T23:59:59${EST_OFFSET}`;
}

/**
 * Format date for display (e.g., "Mar 15, 2026")
 */
export function formatDateDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: EST_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format time for display (e.g., "9:30 AM")
 */
export function formatTimeDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    timeZone: EST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get trading hours status
 * Returns 'pre-market', 'open', 'post-market', or 'closed'
 */
export function getMarketSession(): 'pre-market' | 'open' | 'post-market' | 'closed' {
  const now = new Date();
  const hour = parseInt(now.toLocaleTimeString('en-US', {
    timeZone: EST_TIMEZONE,
    hour: '2-digit',
    hour12: false
  }));
  const minute = parseInt(now.toLocaleTimeString('en-US', {
    timeZone: EST_TIMEZONE,
    minute: '2-digit',
    hour12: false
  }));
  
  const time = hour * 60 + minute; // Minutes since midnight
  
  // Pre-market: 4:00 AM - 9:30 AM
  if (time >= 240 && time < 570) return 'pre-market';
  // Open: 9:30 AM - 4:00 PM
  if (time >= 570 && time < 960) return 'open';
  // Post-market: 4:00 PM - 8:00 PM
  if (time >= 960 && time < 1200) return 'post-market';
  // Closed: 8:00 PM - 4:00 AM
  return 'closed';
}

/**
 * Check if today is a trading day (Mon-Fri)
 */
export function isTradingDay(): boolean {
  const now = new Date();
  const dayOfWeek = parseInt(now.toLocaleDateString('en-US', {
    timeZone: EST_TIMEZONE,
    weekday: 'narrow'
  }));
  // Monday = 1, Friday = 5
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Get date string (YYYY-MM-DD) from a timestamp in EST
 * Extracts just the date portion from an ISO timestamp
 */
export function getESTDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const estDateStr = date.toLocaleDateString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const [month, day, year] = estDateStr.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string to EST and return as ISO string with -05:00 offset
 */
export function parseDateToEST(dateStr: string): string {
  // Handle YYYY-MM-DD format
  if (dateStr.includes('-') && dateStr.length === 10) {
    return `${dateStr}T00:00:00${EST_OFFSET}`;
  }
  
  // Handle other formats by parsing
  const date = new Date(dateStr);
  const estDateStr = date.toLocaleString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const [datePart, timePart] = estDateStr.split(', ');
  const [month, day, year] = datePart.split('/');
  return `${year}-${month}-${day}T${timePart}${EST_OFFSET}`;
}
