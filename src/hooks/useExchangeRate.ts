import { createContext, useContext } from 'react';

/** Exchange rates per 1 USD. */
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

export interface ExchangeRateContextValue {
  rates: ExchangeRates | null;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  /** False while the app uses the shared, up-to-date rates, when refreshing can't help. */
  canRefresh: boolean;
  /** Fetches rates for this device only (the shared rates are published by a Cloud Function). */
  refetch: () => Promise<void>;
}

export const ExchangeRateContext = createContext<ExchangeRateContextValue | null>(null);

/** Reads the app-wide exchange rates provided by <ExchangeRateProvider>. */
export function useExchangeRate(): ExchangeRateContextValue {
  const value = useContext(ExchangeRateContext);
  if (!value) {
    throw new Error('useExchangeRate must be used inside <ExchangeRateProvider>');
  }
  return value;
}
