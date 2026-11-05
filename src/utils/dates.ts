// Trip and purchase dates are calendar days, not instants. <input type="date"> works with
// "YYYY-MM-DD" strings, so convert using the *local* calendar. toISOString() and
// new Date('YYYY-MM-DD') both use UTC, which shifts the day for anyone outside UTC.

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formats a date as the local calendar day ("YYYY-MM-DD"). Returns '' for an invalid date. */
export function toDateInput(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const utc = isUtcNoon(date);
  const year = String(utc ? date.getUTCFullYear() : date.getFullYear()).padStart(4, '0');
  const month = String((utc ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
  const day = String(utc ? date.getUTCDate() : date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" value as 12:00 UTC on that day. Noon UTC is the same calendar
 * day in every time zone from UTC-11 to UTC+11, so a trip planned in Tokyo shows the
 * same dates to a partner in New York.
 * Returns null for an empty, malformed or impossible date (such as 2027-02-30).
 */
export function fromDateInput(value: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, monthIndex, day, 12));
  date.setUTCFullYear(year, monthIndex, day); // Date.UTC maps years 0-99 to 1900-1999

  const isSameDay =
    date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex && date.getUTCDate() === day;
  return isSameDay ? date : null;
}

/**
 * Dates saved by fromDateInput sit at exactly 12:00 UTC. Older trips stored local
 * midnight in the creator's time zone, and are still read with local getters.
 */
function isUtcNoon(date: Date): boolean {
  return (
    date.getUTCHours() === 12 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

/** The stored calendar day as a local-midnight Date, for display with local formatters. */
export function calendarDay(date: Date): Date {
  if (Number.isNaN(date.getTime()) || !isUtcNoon(date)) return date;
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Today's local calendar day ("YYYY-MM-DD"), e.g. to default a date input. */
export function todayInput(): string {
  return toDateInput(new Date());
}
