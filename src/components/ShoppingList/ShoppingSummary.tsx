import { useMemo } from 'react';
import { TrendingDown, TrendingUp, ShoppingCart } from 'lucide-react';
import type { ShoppingListItem } from '../../types/ShoppingList';
import { formatCurrency } from '../../utils/currency';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { convertCurrency } from '../../utils/currency';

interface ShoppingSummaryProps {
  items: ShoppingListItem[];
  budgetCurrency: string;
}

export function ShoppingSummary({ items, budgetCurrency }: ShoppingSummaryProps) {
  const { rates } = useExchangeRate();

  const summary = useMemo(() => {
    let totalPlanned = 0;
    let totalActual = 0;
    let itemsWithActualPrice = 0;
    const purchasedCount = items.filter(item => item.purchased).length;

    items.forEach(item => {
      // Calculate planned total in budget currency
      const plannedPrice = item.currency === budgetCurrency
        ? item.price
        : convertCurrency(item.price, item.currency, budgetCurrency, rates);

      totalPlanned += plannedPrice * item.quantity;

      // Calculate actual total if purchase price exists
      if (item.purchased && item.purchasePrice !== undefined && item.purchaseCurrency) {
        const actualPrice = item.purchaseCurrency === budgetCurrency
          ? item.purchasePrice
          : convertCurrency(item.purchasePrice, item.purchaseCurrency, budgetCurrency, rates);

        totalActual += actualPrice * item.quantity;
        itemsWithActualPrice++;
      } else if (item.purchased) {
        // If purchased but no actual price recorded, use planned price
        totalActual += plannedPrice * item.quantity;
      }
    });

    const difference = totalPlanned - totalActual;
    const percentDifference = totalPlanned > 0 ? (difference / totalPlanned) * 100 : 0;

    return {
      totalPlanned,
      totalActual,
      difference,
      percentDifference,
      purchasedCount,
      totalItems: items.length,
      itemsWithActualPrice,
    };
  }, [items, budgetCurrency, rates]);

  if (items.length === 0) {
    return null;
  }

  const isSaving = summary.difference > 0;
  const isOverspending = summary.difference < 0;

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
              {isSaving ? 'Saved' : isOverspending ? 'Overspent' : 'On Budget'}
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
          {summary.purchasedCount > 0 && Math.abs(summary.percentDifference) > 0 && (
            <div className={`text-xs mt-1 ${
              isSaving ? 'text-green-600' : isOverspending ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(summary.percentDifference).toFixed(1)}% {isSaving ? 'under' : 'over'} budget
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
