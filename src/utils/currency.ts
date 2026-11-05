import type { ExchangeRates } from '../hooks/useExchangeRate';

// One formatter per locale and currency; building an Intl.NumberFormat is relatively slow.
const formatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string, locale: string | undefined): Intl.NumberFormat {
  const key = `${locale ?? ''}|${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats an amount of money for display, e.g. "$1,392.98", "€320.00" or (in French) "320,00 €".
 * Intl picks the symbol, its position and the number of decimals (none for JPY) for the locale.
 *
 * @param locale BCP 47 locale; defaults to the browser's locale.
 */
export function formatCurrency(amount: number, currency: string, locale?: string): string {
  const code = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
  try {
    return currencyFormatter(code, locale).format(amount);
  } catch {
    // Not a well-formed ISO 4217 code (e.g. empty): show the number with whatever we were given.
    const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return code ? `${number} ${code}` : number;
  }
}

/**
 * Convert an amount from one currency to another using exchange rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates | null
): number {
  if (!rates) return amount;
  if (fromCurrency === toCurrency) return amount;

  // Validate rates exist and are > 0 before division
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  // All rates are relative to USD
  if (fromCurrency === 'USD') {
    if (!toRate || toRate <= 0) {
      console.warn(`Invalid exchange rate for ${toCurrency}`);
      return amount;
    }
    return amount * toRate;
  } else if (toCurrency === 'USD') {
    if (!fromRate || fromRate <= 0) {
      console.warn(`Invalid exchange rate for ${fromCurrency}`);
      return amount;
    }
    return amount / fromRate;
  } else {
    // Convert through USD
    if (!fromRate || fromRate <= 0 || !toRate || toRate <= 0) {
      console.warn(`Invalid exchange rates for ${fromCurrency} -> ${toCurrency}`);
      return amount;
    }
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }
}

/**
 * Format a time difference as a human-readable string
 */
export function formatLastUpdated(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Check if currency conversion is needed
 */
export function needsConversion(currency: string): boolean {
  return currency !== 'USD';
}

/**
 * Calculate total price in USD for multiple items
 */
export function calculateTotalUSD(
  items: Array<{ price: number; currency: string; quantity: number; priceUSD?: number }>,
  rates: ExchangeRates | null
): number {
  return items.reduce((total, item) => {
    // Use cached USD price if available, otherwise convert
    const itemPriceUSD = item.priceUSD || convertCurrency(item.price, item.currency, 'USD', rates);
    return total + (itemPriceUSD * item.quantity);
  }, 0);
}
