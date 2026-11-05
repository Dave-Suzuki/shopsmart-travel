// Trip and purchase dates are calendar days, not instants. <input type="date"> works with
// "YYYY-MM-DD" strings, so convert using the *local* calendar. toISOString() and
// new Date('YYYY-MM-DD') both use UTC, which shifts the day for anyone outside UTC.

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formats a date as the local calendar day ("YYYY-MM-DD"). Returns '' for an invalid date. */
export function toDateInput(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" value as local midnight on that day.
 * Returns null for an empty, malformed or impossible date (such as 2027-02-30).
 */
export function fromDateInput(value: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(year, monthIndex, day);
  date.setFullYear(year, monthIndex, day); // new Date() maps years 0-99 to 1900-1999

  const isSameDay =
    date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
  return isSameDay ? date : null;
}

/** Today's local calendar day ("YYYY-MM-DD"), e.g. to default a date input. */
export function todayInput(): string {
  return toDateInput(new Date());
}
