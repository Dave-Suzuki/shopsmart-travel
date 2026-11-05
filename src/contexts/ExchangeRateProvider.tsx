import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  ExchangeRateContext,
  type ExchangeRateContextValue,
  type ExchangeRates,
} from '../hooks/useExchangeRate';

// Rates come from the newest exchangeRates doc, which only a scheduled Cloud Function may
// write. If there's no recent doc, this device fetches rates from the public API for itself
// (kept in state and localStorage, never written back to Firestore).

const CACHE_KEY = 'exchange_rates_cache';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

interface RateSet {
  rates: ExchangeRates;
  updatedAt: Date;
}

/** Validates raw rate data; rejects malformed rates and future-dated docs. */
function toRateSet(rates: unknown, updatedAt: Date | null): RateSet | null {
  if (!updatedAt || Number.isNaN(updatedAt.getTime())) return null;
  if (updatedAt.getTime() - Date.now() > MAX_AGE_MS) return null;
  if (!rates || typeof rates !== 'object') return null;
  const values = Object.values(rates);
  if (values.length === 0 || !values.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)) {
    return null;
  }
  return { rates: rates as ExchangeRates, updatedAt };
}

function isRecent(set: RateSet): boolean {
  return Date.now() - set.updatedAt.getTime() < MAX_AGE_MS;
}

function readCache(): RateSet | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached);
    return toRateSet(data?.rates, new Date(data?.timestamp));
  } catch (err) {
    console.error('Error loading exchange rate cache:', err);
    return null;
  }
}

function writeCache(set: RateSet) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rates: set.rates, timestamp: set.updatedAt.toISOString() })
    );
  } catch (err) {
    console.error('Error saving exchange rate cache:', err);
  }
}

function newest(...sets: (RateSet | null | undefined)[]): RateSet | null {
  let best: RateSet | null = null;
  for (const set of sets) {
    if (set && (!best || set.updatedAt > best.updatedAt)) best = set;
  }
  return best;
}

/** Provides one shared set of exchange rates (and one Firestore listener) to the whole app. */
export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [cached] = useState(readCache);
  const [shared, setShared] = useState<{ set: RateSet; recent: boolean } | null>(null);
  const [fallback, setFallback] = useState<RateSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fallbackRequested = useRef(false);

  const fetchFallback = useCallback(async () => {
    fallbackRequested.current = true;
    try {
      const response = await fetch(EXCHANGE_API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const set = toRateSet(data?.rates, new Date(data?.time_last_updated * 1000 || Date.now()));
      if (!set) throw new Error('Unexpected exchange rate data');
      setFallback(set);
      setError(null);
      writeCache(set);
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Failed to fetch exchange rates');
    }
  }, []);

  useEffect(() => {
    const requestFallback = () => {
      if (!fallbackRequested.current) void fetchFallback();
    };

    const q = query(collection(db, 'exchangeRates'), orderBy('updatedAt', 'desc'), limit(1));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.docs[0]?.data();
        const updatedAt = data?.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null;
        const set = data ? toRateSet(data.rates, updatedAt) : null;
        if (set) {
          const recent = isRecent(set);
          setShared({ set, recent });
          if (recent) {
            writeCache(set);
            return;
          }
        }
        // No recent shared rates. Wait for the server's answer unless we're offline (then the
        // fetch fails fast and the UI can offer a retry).
        if (!snapshot.metadata.fromCache || !navigator.onLine) requestFallback();
      },
      (err) => {
        console.error('Error listening to exchange rates:', err);
        requestFallback();
      }
    );
  }, [fetchFallback]);

  // Recent shared rates always win; otherwise use the newest rates we have.
  const active = shared?.recent ? shared.set : newest(fallback, shared?.set, cached);
  const canRefresh = !shared?.recent;

  const value = useMemo<ExchangeRateContextValue>(
    () => ({
      rates: active?.rates ?? null,
      lastUpdated: active?.updatedAt ?? null,
      loading: !active && !error,
      error: active ? null : error,
      canRefresh,
      refetch: fetchFallback,
    }),
    [active, error, canRefresh, fetchFallback]
  );

  return <ExchangeRateContext.Provider value={value}>{children}</ExchangeRateContext.Provider>;
}
