import { describe, expect, it } from 'vitest';
import type { ExchangeRates } from '../hooks/useExchangeRate';
import { computeBudget, type BudgetItem } from './budget';

// Rates are per 1 USD: 1 USD = 0.5 EUR = 0.25 GBP, so 1 EUR = 2 USD and 1 GBP = 4 USD.
const rates = { USD: 1, EUR: 0.5, GBP: 0.25, JPY: 100, CAD: 1.25, AUD: 1.5, CHF: 0.8, CNY: 7 } as ExchangeRates;

const item = (overrides: Partial<BudgetItem>): BudgetItem => ({
  price: 0,
  currency: 'USD',
  quantity: 1,
  purchased: false,
  ...overrides,
});

describe('computeBudget', () => {
  it('converts mixed currencies into the budget currency', () => {
    const items = [
      item({ price: 10, currency: 'EUR', quantity: 2 }), // to buy: 40 USD
      item({ price: 5, currency: 'GBP' }), // to buy: 20 USD
      item({ price: 30, currency: 'USD', purchased: true }), // spent: 30 USD (no actual price recorded)
    ];

    const result = computeBudget(items, 1000, 'USD', rates);

    expect(result.spent).toBeCloseTo(30);
    expect(result.toBuy).toBeCloseTo(60);
    expect(result.projected).toBeCloseTo(90);
    expect(result.free).toBeCloseTo(910);
    expect(result.savedVsPlan).toBeCloseTo(0);
    expect(result.usedPct).toBeCloseTo(9);
  });

  it('converts into a non-USD budget currency', () => {
    const items = [item({ price: 100, currency: 'USD' }), item({ price: 10, currency: 'GBP' })];

    const result = computeBudget(items, 200, 'EUR', rates);

    expect(result.toBuy).toBeCloseTo(50 + 20); // 100 USD = 50 EUR, 10 GBP = 20 EUR
    expect(result.usedPct).toBeCloseTo(35);
  });

  it('counts what was actually paid, and saved-vs-plan on purchased items only', () => {
    // The reported case: 5 items, one bought (planned 2 × €38, paid 2 × €36).
    const items = [
      item({ price: 38, currency: 'EUR', quantity: 2, purchased: true, purchasePrice: 36, purchaseCurrency: 'EUR' }),
      item({ price: 400, currency: 'USD' }),
      item({ price: 250, currency: 'EUR' }),
      item({ price: 50, currency: 'GBP' }),
      item({ price: 19.99, currency: 'USD', quantity: 3 }),
    ];

    const result = computeBudget(items, 3000, 'USD', rates);

    expect(result.spent).toBeCloseTo(144); // 2 × 36 EUR, not the planned total
    expect(result.savedVsPlan).toBeCloseTo(8); // 2 × (38 - 36) EUR = 4 EUR = 8 USD
    expect(result.toBuy).toBeCloseTo(400 + 500 + 200 + 59.97);
    expect(result.projected).toBeCloseTo(144 + 1159.97);
    expect(result.free).toBeCloseTo(3000 - 1303.97);
  });

  it('handles an actual price paid in a different currency, including overspending', () => {
    const items = [
      item({ price: 100, currency: 'USD', purchased: true, purchasePrice: 40, purchaseCurrency: 'GBP' }), // paid 160 USD
      item({ price: 10, currency: 'EUR', purchased: true, purchasePrice: 9 }), // paid 9 EUR = 18 USD
    ];

    const result = computeBudget(items, 500, 'USD', rates);

    expect(result.spent).toBeCloseTo(178);
    expect(result.savedVsPlan).toBeCloseTo(120 - 178);
    expect(result.toBuy).toBe(0);
  });

  it('ignores a purchase currency when no actual price was recorded', () => {
    const items = [item({ price: 10, currency: 'EUR', purchased: true, purchaseCurrency: 'USD' })];

    expect(computeBudget(items, 100, 'USD', rates).spent).toBeCloseTo(20);
  });

  it('leaves out items saved for later', () => {
    const items = [
      item({ price: 50, currency: 'USD' }),
      item({ price: 1000, currency: 'USD', savedForLater: true }),
      item({ price: 500, currency: 'USD', purchased: true, purchasePrice: 400, savedForLater: true }),
    ];

    const result = computeBudget(items, 100, 'USD', rates);

    expect(result.spent).toBe(0);
    expect(result.toBuy).toBeCloseTo(50);
    expect(result.savedVsPlan).toBe(0);
    expect(result.usedPct).toBeCloseTo(50);
  });

  it('reports no percentage when there is no budget', () => {
    const items = [item({ price: 20, currency: 'USD' }), item({ price: 5, currency: 'USD', purchased: true })];

    const result = computeBudget(items, 0, 'USD', rates);

    expect(result.usedPct).toBeNull();
    expect(result.projected).toBeCloseTo(25);
    expect(result.free).toBeCloseTo(-25);
  });

  it('returns zeros for an empty list', () => {
    expect(computeBudget([], 100, 'USD', rates)).toEqual({
      spent: 0,
      toBuy: 0,
      free: 100,
      projected: 0,
      savedVsPlan: 0,
      usedPct: 0,
    });
  });
});
