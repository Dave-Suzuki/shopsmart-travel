import { describe, expect, it } from 'vitest';
import type { ExchangeRates } from '../hooks/useExchangeRate';
import { convertCurrency, formatCurrency } from './currency';

// Intl separates some symbols with (narrow) no-break spaces; compare with plain spaces.
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('formatCurrency', () => {
  it('formats US dollars with grouping and cents', () => {
    expect(formatCurrency(1392.98, 'USD', 'en-US')).toBe('$1,392.98');
    expect(formatCurrency(3000, 'USD', 'en-US')).toBe('$3,000.00');
  });

  it('places the symbol the way the locale does', () => {
    expect(formatCurrency(320, 'EUR', 'en-US')).toBe('€320.00');
    expect(plain(formatCurrency(320, 'EUR', 'fr-FR'))).toBe('320,00 €');
    expect(plain(formatCurrency(1234.5, 'EUR', 'de-DE'))).toBe('1.234,50 €');
    expect(formatCurrency(1234.5, 'GBP', 'en-GB')).toBe('£1,234.50');
  });

  it('uses the right number of decimals for each currency', () => {
    expect(formatCurrency(10000.4, 'JPY', 'en-US')).toBe('¥10,000');
    expect(formatCurrency(1.005, 'USD', 'en-US')).toMatch(/^\$1\.0\d$/);
    expect(formatCurrency(0, 'GBP', 'en-GB')).toBe('£0.00');
  });

  it('disambiguates dollars outside the US', () => {
    expect(formatCurrency(5, 'USD', 'en-CA')).toBe('US$5.00');
    expect(formatCurrency(5, 'CAD', 'en-US')).toBe('CA$5.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-42.5, 'USD', 'en-US')).toBe('-$42.50');
  });

  it('accepts lower-case and padded codes', () => {
    expect(formatCurrency(12, ' usd ', 'en-US')).toBe('$12.00');
  });

  it('shows the code for currencies without a symbol', () => {
    expect(plain(formatCurrency(12, 'CHF', 'en-US'))).toBe('CHF 12.00');
  });

  it('falls back to the plain number for a malformed code', () => {
    expect(formatCurrency(12, 'US', 'en-US')).toBe('12.00 US');
    expect(formatCurrency(12, '', 'en-US')).toBe('12.00');
  });

  it('uses the default locale when none is given', () => {
    const expected = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(99.5);
    expect(formatCurrency(99.5, 'EUR')).toBe(expected);
  });
});

describe('convertCurrency', () => {
  const rates = { USD: 1, EUR: 0.5, GBP: 0.25, JPY: 100, CAD: 1.25, AUD: 1.5, CHF: 0.8, CNY: 7 } as ExchangeRates;

  it('converts to, from and between non-USD currencies', () => {
    expect(convertCurrency(10, 'USD', 'EUR', rates)).toBeCloseTo(5);
    expect(convertCurrency(10, 'EUR', 'USD', rates)).toBeCloseTo(20);
    expect(convertCurrency(10, 'GBP', 'EUR', rates)).toBeCloseTo(20);
  });

  it('returns the amount unchanged for the same currency', () => {
    expect(convertCurrency(10, 'EUR', 'EUR', rates)).toBe(10);
  });
});
