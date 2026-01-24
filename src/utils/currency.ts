import type { ExchangeRates } from '../hooks/useExchangeRate';

/**
 * Format a currency value with the appropriate symbol and formatting
 */
export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
  };

  const symbol = currencySymbols[currency] || currency;

  // For JPY and CNY, don't show decimals
  const decimals = ['JPY', 'CNY'].includes(currency) ? 0 : 2;

  const formatted = amount.toFixed(decimals);

  // Position symbol based on currency
  if (['EUR'].includes(currency)) {
    return `${formatted}${symbol}`;
  }

  return `${symbol}${formatted}`;
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
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
  };

  return currencySymbols[currency] || currency;
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
