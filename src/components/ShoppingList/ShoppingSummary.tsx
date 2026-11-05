import { useMemo } from 'react';
import { TrendingDown, TrendingUp, ShoppingCart } from 'lucide-react';
import type { ShoppingListItem } from '../../types/ShoppingList';
import { formatCurrency } from '../../utils/currency';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { computeBudget } from '../../utils/budget';

interface ShoppingSummaryProps {
  items: ShoppingListItem[];
  budget: number;
  budgetCurrency: string;
}

export function ShoppingSummary({ items, budget, budgetCurrency }: ShoppingSummaryProps) {
  const { rates } = useExchangeRate();

  const summary = useMemo(() => {
    const activeItems = items.filter(item => !item.savedForLater);
    const purchased = activeItems.filter(item => item.purchased);
    const { spent, toBuy, savedVsPlan } = computeBudget(activeItems, budget, budgetCurrency, rates);
    // What the purchased items were planned to cost (savedVsPlan = that - spent)
    const plannedForPurchased = spent + savedVsPlan;

    return {
      totalPlanned: plannedForPurchased + toBuy,
      totalActual: spent,
      // Saved (+) or overspent (-) versus the planned prices of the items bought so far
      difference: savedVsPlan,
      percentDifference: plannedForPurchased > 0 ? (savedVsPlan / plannedForPurchased) * 100 : 0,
      purchasedCount: purchased.length,
      totalItems: activeItems.length,
      itemsWithActualPrice: purchased.filter(item => item.purchasePrice != null).length,
    };
  }, [items, budget, budgetCurrency, rates]);

  if (items.length === 0) {
    return null;
  }

  // Ignore sub-cent differences from currency conversion
  const isSaving = summary.difference >= 0.005;
  const isOverspending = summary.difference <= -0.005;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">Shopping Summary</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Planned Spending */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Planned Spending</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(summary.totalPlanned, budgetCurrency)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.totalItems} {summary.totalItems === 1 ? 'item' : 'items'}
          </div>
        </div>

        {/* Actual Spending */}
        <div className={`p-4 rounded-lg border ${
          summary.purchasedCount > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="text-sm text-gray-600 mb-1">Actual Spending</div>
          <div className={`text-2xl font-bold ${
            summary.purchasedCount > 0 ? 'text-green-900' : 'text-gray-500'
          }`}>
            {summary.purchasedCount > 0
              ? formatCurrency(summary.totalActual, budgetCurrency)
              : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.purchasedCount} of {summary.totalItems} purchased
            {summary.itemsWithActualPrice > 0 && (
              <span className="ml-1">
                ({summary.itemsWithActualPrice} with price)
              </span>
            )}
          </div>
        </div>

        {/* Savings/Overspending */}
        <div className={`p-4 rounded-lg border ${
          !summary.purchasedCount
            ? 'bg-gray-50 border-gray-200'
            : isSaving
            ? 'bg-green-50 border-green-200'
            : isOverspending
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-600">
              {isSaving ? 'Saved' : isOverspending ? 'Overspent' : 'On Plan'}
            </span>
            {isSaving && <TrendingDown className="w-4 h-4 text-green-600" />}
            {isOverspending && <TrendingUp className="w-4 h-4 text-red-600" />}
          </div>
          <div className={`text-2xl font-bold ${
            !summary.purchasedCount
              ? 'text-gray-500'
              : isSaving
              ? 'text-green-900'
              : isOverspending
              ? 'text-red-900'
              : 'text-yellow-900'
          }`}>
            {!summary.purchasedCount ? '—' : formatCurrency(Math.abs(summary.difference), budgetCurrency)}
          </div>
          {summary.purchasedCount > 0 && (isSaving || isOverspending) && (
            <div className={`text-xs mt-1 ${
              isSaving ? 'text-green-600' : isOverspending ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(summary.percentDifference).toFixed(1)}% {isSaving ? 'below' : 'above'} planned prices
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {summary.purchasedCount > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Purchase Progress</span>
            <span>
              {summary.purchasedCount} / {summary.totalItems} items ({((summary.purchasedCount / summary.totalItems) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-green-600"
              style={{ width: `${(summary.purchasedCount / summary.totalItems) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Helpful hints */}
      {summary.purchasedCount > 0 && summary.itemsWithActualPrice < summary.purchasedCount && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> {summary.purchasedCount - summary.itemsWithActualPrice} purchased{' '}
            {summary.purchasedCount - summary.itemsWithActualPrice === 1 ? 'item' : 'items'} missing actual price.
            Edit {summary.purchasedCount - summary.itemsWithActualPrice === 1 ? 'it' : 'them'} to see accurate spending comparison.
          </p>
        </div>
      )}
    </div>
  );
}
