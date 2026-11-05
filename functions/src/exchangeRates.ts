import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

export const EXCHANGE_RATE_SOURCE_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_CURRENCIES = 500;

/** Plausible USD-based ranges; a value outside them means the feed is broken. */
const SANITY_BOUNDS: Readonly<Record<string, readonly [number, number]>> = {
  EUR: [0.5, 2],
  GBP: [0.4, 2],
  JPY: [50, 400],
};

/**
 * Validates an exchangerate-api.com v4 payload and returns its rates. Throws (and the
 * caller writes nothing) unless `rates` is an object of finite positive numbers keyed
 * by 3-letter codes, USD is exactly 1 and EUR/GBP/JPY are within sanity bounds.
 */
export function validateExchangeRates(payload: unknown): Record<string, number> {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Exchange-rate response is not a JSON object');
  }
  const { base, rates } = payload as { base?: unknown; rates?: unknown };
  if (base !== undefined && base !== 'USD') {
    throw new Error(`Unexpected base currency: ${String(base)}`);
  }
  if (typeof rates !== 'object' || rates === null || Array.isArray(rates)) {
    throw new Error('Exchange-rate response has no rates object');
  }

  const entries = Object.entries(rates);
  if (entries.length === 0 || entries.length > MAX_CURRENCIES) {
    throw new Error(`Unexpected number of currencies: ${entries.length}`);
  }

  const validated: Record<string, number> = {};
  for (const [code, value] of entries) {
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new Error(`Invalid currency code: ${code}`);
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid rate for ${code}: ${String(value)}`);
    }
    validated[code] = value;
  }

  if (validated.USD !== 1) {
    throw new Error(`USD rate must be 1, got ${String(validated.USD)}`);
  }
  for (const [code, [min, max]] of Object.entries(SANITY_BOUNDS)) {
    const value = validated[code];
    if (value === undefined || value < min || value > max) {
      throw new Error(`${code} rate ${String(value)} is outside the sanity range ${min}-${max}`);
    }
  }
  return validated;
}

async function fetchLatestRates(): Promise<Record<string, number>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(EXCHANGE_RATE_SOURCE_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Exchange-rate API responded with HTTP ${response.status}`);
    }
    return validateExchangeRates(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Refreshes exchangeRates/{YYYY-MM-DD} (UTC) every 6 hours. This is the only writer of
 * the collection; clients read the newest document ordered by updatedAt. A fetch or
 * validation failure throws so the run is logged as failed and nothing is written.
 */
export const refreshExchangeRates = onSchedule(
  { schedule: 'every 6 hours', timeZone: 'Etc/UTC', retryCount: 2, timeoutSeconds: 60 },
  async () => {
    const rates = await fetchLatestRates();
    const docId = new Date().toISOString().slice(0, 10);
    await getFirestore().collection('exchangeRates').doc(docId).set({
      base: 'USD',
      rates,
      updatedAt: Timestamp.now(),
      source: 'exchangerate-api.com',
    });
    functions.logger.info('Exchange rates refreshed', {
      docId,
      currencies: Object.keys(rates).length,
    });
  },
);
