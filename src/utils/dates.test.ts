import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fromDateInput, toDateInput, todayInput } from './dates';

// `process` isn't in the app's type set, so reach it through globalThis.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

/** Runs the enclosing describe block's tests in the given IANA time zone. */
function inTimeZone(timeZone: string) {
  let previous: string | undefined;
  beforeAll(() => {
    previous = env.TZ;
    env.TZ = timeZone;
  });
  afterAll(() => {
    if (previous === undefined) delete env.TZ;
    else env.TZ = previous;
  });
}

const SAMPLE_DAYS = [
  '2027-02-10',
  '2027-02-17',
  '2024-02-29', // leap day
  '2026-01-01',
  '2026-12-31',
  '2026-03-08', // US daylight-saving start
  '2026-03-29', // EU daylight-saving start
  '2026-11-01', // US daylight-saving end
];

describe('toDateInput', () => {
  it('formats the local calendar day with zero padding', () => {
    expect(toDateInput(new Date(2027, 1, 10))).toBe('2027-02-10');
    expect(toDateInput(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('returns an empty string for an invalid date', () => {
    expect(toDateInput(new Date(Number.NaN))).toBe('');
  });
});

describe('fromDateInput', () => {
  it('parses to local midnight of that day', () => {
    const date = fromDateInput('2027-02-10');
    expect(date).not.toBeNull();
    expect([date!.getFullYear(), date!.getMonth(), date!.getDate(), date!.getHours()]).toEqual([2027, 1, 10, 0]);
  });

  it.each(SAMPLE_DAYS)('round-trips %s', (day) => {
    expect(toDateInput(fromDateInput(day)!)).toBe(day);
  });

  it.each(['', '2027-2-10', '10/02/2027', '2027-02-30', '2027-13-01', 'not a date'])(
    'returns null for %j',
    (value) => {
      expect(fromDateInput(value)).toBeNull();
    }
  );
});

describe('todayInput', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the local day, even just before midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 1, 10, 23, 59));
    expect(todayInput()).toBe('2027-02-10');
    vi.setSystemTime(new Date(2027, 1, 10, 0, 1));
    expect(todayInput()).toBe('2027-02-10');
  });
});

// The reported bug: in UTC+ zones, toISOString() showed the day before the one picked.
describe('in Asia/Tokyo (UTC+9)', () => {
  inTimeZone('Asia/Tokyo');

  it('keeps the picked day where toISOString() would shift it', () => {
    const picked = new Date(2027, 1, 10);
    expect(picked.getTimezoneOffset()).toBe(-540); // the zone really is in effect
    expect(picked.toISOString().slice(0, 10)).toBe('2027-02-09'); // the old, buggy formatting
    expect(toDateInput(picked)).toBe('2027-02-10');
  });

  it('parses to Tokyo midnight', () => {
    expect(fromDateInput('2027-02-10')!.toISOString()).toBe('2027-02-09T15:00:00.000Z');
  });

  it.each(SAMPLE_DAYS)('round-trips %s', (day) => {
    expect(toDateInput(fromDateInput(day)!)).toBe(day);
  });
});

// The mirror-image bug: new Date('YYYY-MM-DD') is UTC midnight, the previous day in UTC- zones.
describe('in America/Los_Angeles (UTC-8)', () => {
  inTimeZone('America/Los_Angeles');

  it('keeps the picked day where new Date(string) would shift it', () => {
    expect(toDateInput(new Date('2027-02-10'))).toBe('2027-02-09'); // the old, buggy parsing
    expect(toDateInput(fromDateInput('2027-02-10')!)).toBe('2027-02-10');
  });

  it.each(SAMPLE_DAYS)('round-trips %s', (day) => {
    expect(toDateInput(fromDateInput(day)!)).toBe(day);
  });
});
