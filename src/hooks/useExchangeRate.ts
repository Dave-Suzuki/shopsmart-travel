import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
  CAD: number;
  AUD: number;
  CHF: number;
  CNY: number;
  [key: string]: number;
}

export interface ExchangeRateData {
  rates: ExchangeRates;
  base: string;
  lastUpdated: Date;
}

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Free exchange rate API - no authentication required
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

export function useExchangeRate() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage cache on mount
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data = JSON.parse(cached);
          const cacheTime = new Date(data.timestamp);
          const now = new Date();

          // Check if cache is still valid
          if (now.getTime() - cacheTime.getTime() < CACHE_DURATION) {
            setRates(data.rates);
            setLastUpdated(cacheTime);
            return true;
          }
        }
      } catch (err) {
        console.error('Error loading cache:', err);
      }
      return false;
    };

    if (!loadFromCache()) {
      // If cache miss or expired, fetch fresh data
      fetchExchangeRates();
    } else {
      setLoading(false);
    }
  }, []);

  // Listen to Firestore for updates (for real-time sync across devices)
  useEffect(() => {
    const q = query(
      collection(db, 'exchangeRates'),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();

          if (data.rates) {
            setRates(data.rates);
            const timestamp = (data.updatedAt as Timestamp).toDate();
            setLastUpdated(timestamp);

            // Update localStorage cache
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({
                rates: data.rates,
                timestamp: timestamp.toISOString(),
              }));
            } catch (err) {
              console.error('Error saving to cache:', err);
            }
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to exchange rates:', err);
        // Don't set error here, fallback to API fetch
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchExchangeRates = async () => {
    try {
      setLoading(true);
      const response = await fetch(EXCHANGE_API_URL);

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const data = await response.json();
      const newRates = data.rates as ExchangeRates;
      const timestamp = new Date(data.time_last_updated * 1000 || Date.now());

      setRates(newRates);
      setLastUpdated(timestamp);
      setError(null);

      // Save to Firestore (will trigger the onSnapshot listener)
      try {
        const today = new Date().toISOString().split('T')[0];
        await setDoc(doc(db, 'exchangeRates', today), {
          rates: newRates,
          base: 'USD',
          updatedAt: Timestamp.fromDate(timestamp),
        });
      } catch (firestoreError) {
        console.error('Error saving to Firestore:', firestoreError);
        // Continue even if Firestore save fails - we have the rates in state
      }

      // Save to localStorage
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          rates: newRates,
          timestamp: timestamp.toISOString(),
        }));
      } catch (cacheError) {
        console.error('Error saving to cache:', cacheError);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError('Failed to fetch exchange rates');
      setLoading(false);
    }
  };

  const convert = (amount: number, fromCurrency: string, toCurrency: string = 'USD'): number => {
    if (!rates) return amount;
    if (fromCurrency === toCurrency) return amount;

    // All rates are relative to USD
    if (fromCurrency === 'USD') {
      return amount * (rates[toCurrency] || 1);
    } else if (toCurrency === 'USD') {
      return amount / (rates[fromCurrency] || 1);
    } else {
      // Convert through USD
      const usdAmount = amount / (rates[fromCurrency] || 1);
      return usdAmount * (rates[toCurrency] || 1);
    }
  };

  return {
    rates,
    lastUpdated,
    loading,
    error,
    convert,
    refetch: fetchExchangeRates,
  };
}
