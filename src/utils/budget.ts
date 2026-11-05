import type { ExchangeRates } from '../hooks/useExchangeRate';
import type { ShoppingListItem } from '../types/ShoppingList';
import { convertCurrency } from './currency';

export type BudgetItem = Pick<
  ShoppingListItem,
  'price' | 'currency' | 'quantity' | 'purchased' | 'savedForLater' | 'purchasePrice' | 'purchaseCurrency'
>;

/** Budget figures for a trip, all in the trip's budget currency. */
export interface BudgetSummary {
  /** What was actually paid for purchased items. */
  spent: number;
  /** Planned cost of items not bought yet. */
  toBuy: number;
  /** Budget left after spending and buying the rest (negative when over budget). */
  free: number;
  /** spent + toBuy */
  projected: number;
  /** Planned cost of the purchased items minus what was paid for them (negative = overspent). */
  savedVsPlan: number;
  /** projected as a percentage of the budget, or null when there is no budget. */
  usedPct: number | null;
}

/**
 * Computes a trip's budget figures. Items saved for later are left out. A purchased item counts
 * at its actual price and currency when one was recorded, otherwise at its planned price.
 */
export function computeBudget(
  items: BudgetItem[],
  budget: number,
  budgetCurrency: string,
  rates: ExchangeRates | null
): BudgetSummary {
  const toBudgetCurrency = (amount: number, currency: string) =>
    currency === budgetCurrency ? amount : convertCurrency(amount, currency, budgetCurrency, rates);

  let spent = 0;
  let plannedForPurchased = 0;
  let toBuy = 0;

  for (const item of items) {
    if (item.savedForLater) continue;

    const planned = toBudgetCurrency(item.price, item.currency) * item.quantity;
    if (!item.purchased) {
      toBuy += planned;
      continue;
    }

    // The actual price and its currency go together: a purchase currency without a recorded
    // price says nothing about what was paid.
    const actual =
      item.purchasePrice != null
        ? toBudgetCurrency(item.purchasePrice, item.purchaseCurrency || item.currency) * item.quantity
        : planned;

    spent += actual;
    plannedForPurchased += planned;
  }

  const projected = spent + toBuy;

  return {
    spent,
    toBuy,
    free: budget - projected,
    projected,
    savedVsPlan: plannedForPurchased - spent,
    usedPct: budget > 0 ? (projected / budget) * 100 : null,
  };
}
