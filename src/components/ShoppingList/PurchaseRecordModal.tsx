import { useState, useMemo, useId } from 'react';
import { DollarSign, Calendar, MapPin } from 'lucide-react';
import type { ShoppingListItem, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation } from '../../types/Trip';
import { showError } from '../../utils/toast';
import { fromDateInput, todayInput } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';
import { Modal } from '../Shared/Modal';

interface PurchaseRecordModalProps {
  item: ShoppingListItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<void>;
  tripLocations?: TripLocation[];
  budgetCurrency: string;
}

const INPUT_CLASS =
  'w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const SECONDARY_BUTTON =
  'flex-1 min-h-11 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200';
const PRIMARY_BUTTON =
  'flex-1 min-h-11 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

export function PurchaseRecordModal({ isOpen, ...props }: PurchaseRecordModalProps) {
  // Mount the form only while open, so each opening starts from the item's current values.
  if (!isOpen) return null;
  return <PurchaseRecordForm {...props} />;
}

function PurchaseRecordForm({
  item,
  onClose,
  onSave,
  tripLocations = [],
  budgetCurrency,
}: Omit<PurchaseRecordModalProps, 'isOpen'>) {
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [skipDetails, setSkipDetails] = useState(false);

  // Pre-fill with planned values
  const [formData, setFormData] = useState(() => ({
    purchasePrice: item.price,
    purchaseCurrency: item.currency,
    purchaseDate: todayInput(), // local calendar day, YYYY-MM-DD
    actualPurchaseLocation: item.purchaseLocation || '',
  }));

  // Currencies from the trip's locations, the budget and the item itself (so the pre-filled
  // currency is always one of the options)
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    currencies.add(budgetCurrency);
    currencies.add(item.currency);
    tripLocations.forEach(loc => {
      if (loc.currency) {
        currencies.add(loc.currency);
      }
    });
    return Array.from(currencies).sort();
  }, [tripLocations, budgetCurrency, item.currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: UpdateShoppingListItemInput = {
        purchased: true,
      };

      // Only include purchase details if not skipping
      if (!skipDetails) {
        updates.purchasePrice = formData.purchasePrice;
        updates.purchaseCurrency = formData.purchaseCurrency;
        const purchaseDate = fromDateInput(formData.purchaseDate);
        if (purchaseDate) updates.purchaseDate = purchaseDate;
        updates.actualPurchaseLocation = formData.actualPurchaseLocation;
      }

      await onSave(item.id, updates);
      onClose();
    } catch {
      showError('Failed to update purchase details');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await onSave(item.id, { purchased: true });
      onClose();
    } catch {
      showError('Failed to mark item as purchased');
    } finally {
      setLoading(false);
    }
  };

  const footer = !skipDetails ? (
    <div className="flex gap-3">
      <button type="button" onClick={() => setSkipDetails(true)} className={SECONDARY_BUTTON}>
        Skip Details
      </button>
      <button type="submit" form={formId} disabled={loading} className={PRIMARY_BUTTON}>
        {loading ? 'Saving...' : 'Save Purchase'}
      </button>
    </div>
  ) : (
    <div className="flex gap-3">
      <button type="button" onClick={() => setSkipDetails(false)} className={SECONDARY_BUTTON}>
        Go Back
      </button>
      <button type="button" onClick={handleSkip} disabled={loading} className={PRIMARY_BUTTON}>
        {loading ? 'Saving...' : 'Yes, Mark Purchased'}
      </button>
    </div>
  );

  return (
    <Modal title="Record Purchase" onClose={onClose} footer={footer}>
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-gray-900 mb-1 break-words">{item.name}</h3>
        <p className="text-sm text-gray-600">
          Planned: {formatCurrency(item.price, item.currency)} × {item.quantity}
        </p>
      </div>

      {!skipDetails ? (
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="purchase-price" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4" aria-hidden="true" />
                {item.quantity > 1 ? 'Price per item' : 'Actual Price'} *
              </label>
              <input
                type="number"
                id="purchase-price"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={formData.purchasePrice}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  const validPrice = isNaN(value) || value < 0 ? 0 : value;
                  setFormData({ ...formData, purchasePrice: validPrice });
                }}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="purchase-currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                id="purchase-currency"
                value={formData.purchaseCurrency}
                onChange={(e) => setFormData({ ...formData, purchaseCurrency: e.target.value })}
                className={INPUT_CLASS}
              >
                {availableCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="purchase-date" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              Purchase Date
            </label>
            <input
              type="date"
              id="purchase-date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="actual-location" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              Purchase Location
            </label>
            <select
              id="actual-location"
              value={formData.actualPurchaseLocation}
              onChange={(e) => setFormData({ ...formData, actualPurchaseLocation: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="">Select location</option>
              {tripLocations.map((loc, index) => (
                <option key={index} value={loc.name}>
                  {loc.name}
                </option>
              ))}
              <option value="Online">🌐 Online</option>
            </select>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-600">
          Mark this item as purchased without recording the actual price?
        </p>
      )}
    </Modal>
  );
}
