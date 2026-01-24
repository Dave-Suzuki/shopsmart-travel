import { useState, useMemo } from 'react';
import { X, DollarSign, Calendar, MapPin } from 'lucide-react';
import type { ShoppingListItem, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation } from '../../types/Trip';

interface PurchaseRecordModalProps {
  item: ShoppingListItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<void>;
  tripLocations?: TripLocation[];
  budgetCurrency: string;
}

export function PurchaseRecordModal({
  item,
  isOpen,
  onClose,
  onSave,
  tripLocations = [],
  budgetCurrency,
}: PurchaseRecordModalProps) {
  const [loading, setLoading] = useState(false);
  const [skipDetails, setSkipDetails] = useState(false);

  // Pre-fill with planned values
  const [formData, setFormData] = useState({
    purchasePrice: item.price,
    purchaseCurrency: item.currency,
    purchaseDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    actualPurchaseLocation: item.purchaseLocation || '',
  });

  // Get all unique currencies from trip locations + budget currency
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    currencies.add(budgetCurrency);
    tripLocations.forEach(loc => {
      if (loc.currency) {
        currencies.add(loc.currency);
      }
    });
    return Array.from(currencies).sort();
  }, [tripLocations, budgetCurrency]);

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
        updates.purchaseDate = new Date(formData.purchaseDate);
        updates.actualPurchaseLocation = formData.actualPurchaseLocation;
      }

      await onSave(item.id, updates);
      onClose();
    } catch (error) {
      alert('Failed to update purchase details');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await onSave(item.id, { purchased: true });
      onClose();
    } catch (error) {
      alert('Failed to mark item as purchased');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Record Purchase</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-gray-900 mb-1">{item.name}</h3>
            <p className="text-sm text-gray-600">
              Planned: {item.price.toFixed(2)} {item.currency} × {item.quantity}
            </p>
          </div>

          {!skipDetails ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="purchase-price" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Actual Price *
                    </div>
                  </label>
                  <input
                    type="number"
                    id="purchase-price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      const validPrice = isNaN(value) || value < 0 ? 0 : value;
                      setFormData({ ...formData, purchasePrice: validPrice });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label htmlFor="purchase-date" className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Purchase Date
                  </div>
                </label>
                <input
                  type="date"
                  id="purchase-date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="actual-location" className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Purchase Location
                  </div>
                </label>
                <select
                  id="actual-location"
                  value={formData.actualPurchaseLocation}
                  onChange={(e) => setFormData({ ...formData, actualPurchaseLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSkipDetails(true)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Skip Details
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Saving...' : 'Save Purchase'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Mark this item as purchased without recording the actual price?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSkipDetails(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Go Back
                </button>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Saving...' : 'Yes, Mark Purchased'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
