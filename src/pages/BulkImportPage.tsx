import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { useShoppingList } from '../hooks/useShoppingList';
import { useExchangeRate } from '../hooks/useExchangeRate';
import type { CreateShoppingListItemInput } from '../types/ShoppingList';
import type { ItemInitialData } from '../components/ShoppingList/AddShoppingItem';
import { ItemThumbnail } from '../components/ShoppingList/ItemThumbnail';
import { convertCurrency, formatCurrency } from '../utils/currency';
import { decodePayload } from '../utils/payload';

interface ImportItem extends ItemInitialData {
  id: string; // Temporary ID for tracking selection
  selected: boolean;
}

export function BulkImportPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { trips, loading: tripsLoading, fromCache: tripsFromCache } = useTrips(user?.uid || null);
  const { addItem } = useShoppingList(tripId || null);
  const { rates } = useExchangeRate();

  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const trip = trips.find((t) => t.id === tripId);

  // Parse items from URL query param on mount
  useEffect(() => {
    const itemsParam = searchParams.get('items');

    if (itemsParam) {
      try {
        // UTF-8 base64url JSON array from the extension (older links work too)
        const decoded = decodePayload(itemsParam);

        if (!Array.isArray(decoded)) {
          throw new Error('Expected an array of items');
        }

        const items = decoded.filter(
          (item): item is ItemInitialData => !!item && typeof item === 'object' && !Array.isArray(item)
        );

        // Add temporary IDs and selection state
        const importItems: ImportItem[] = items.map((item, index) => ({
          ...item,
          id: `import-${index}-${Date.now()}`,
          selected: true, // Select all by default
        }));

        setImportItems(importItems);
      } catch (e) {
        console.error('Failed to parse items param:', e);
        setParseError('Failed to parse import data. The URL may be invalid or corrupted.');
      }
    } else {
      setParseError('No items data found in URL.');
    }
  }, [searchParams]);

  // Toggle item selection
  const toggleItem = (itemId: string) => {
    setImportItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Select/deselect all items
  const toggleAll = (selected: boolean) => {
    setImportItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  // Count selected items
  const selectedCount = useMemo(
    () => importItems.filter((item) => item.selected).length,
    [importItems]
  );

  // Total of the selected items in the trip's budget currency (items can be priced in others)
  const budgetCurrency = trip?.budgetCurrency || 'USD';
  const selectedTotal = useMemo(() => {
    return importItems
      .filter((item) => item.selected)
      .reduce((sum, item) => {
        const amount = (item.price || 0) * (item.quantity || 1);
        const currency = item.currency || budgetCurrency;
        return sum + (currency === budgetCurrency ? amount : convertCurrency(amount, currency, budgetCurrency, rates));
      }, 0);
  }, [importItems, budgetCurrency, rates]);

  // Import selected items
  const handleImport = async () => {
    const selectedItems = importItems.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      setImportError('Please select at least one item to import.');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      // Add items sequentially to avoid race conditions
      for (const item of selectedItems) {
        const itemData: CreateShoppingListItemInput = {
          name: item.name || 'Unnamed Item',
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          price: item.price || 0,
          currency: item.currency || trip?.budgetCurrency || 'USD',
          category: item.category,
          brand: item.brand,
          notes: item.notes,
          imageUrl: item.imageUrl,
          description: item.description,
          productUrl: item.productUrl,
        };

        await addItem(itemData);
      }

      setImportSuccess(true);

      // Redirect to trip detail page after short delay
      setTimeout(() => {
        navigate(`/app/trip/${tripId}`);
      }, 1500);
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to import some items. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  // Format price for display
  const formatPrice = (price?: number, currency?: string) => {
    if (price === undefined || price === null) return 'No price';
    return formatCurrency(price, currency || budgetCurrency);
  };

  if (!trip) {
    if (authLoading || tripsLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip...</p>
        </div>
      );
    }

    // Deleted, no longer shared with this user, or (offline) not in the local cache
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Trip not found</p>
        {tripsFromCache && (
          <p className="text-sm text-gray-500 mt-1">You're offline. Your trips will appear when you reconnect.</p>
        )}
        <Link to="/app" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
          Back to Trips
        </Link>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          to={`/app/trip/${tripId}`}
          className="-ml-1 mb-3 sm:mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Back to Trip
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Error</h2>
          <p className="text-gray-600 mb-6">{parseError}</p>
          <Link
            to={`/app/trip/${tripId}`}
            className="inline-flex min-h-11 items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            Return to Shopping List
          </Link>
        </div>
      </div>
    );
  }

  if (importSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h2>
          <p className="text-gray-600 mb-4">
            Successfully imported {selectedCount} item{selectedCount !== 1 ? 's' : ''} to your
            shopping list.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to={`/app/trip/${tripId}`}
        className="-ml-1 mb-3 sm:mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-gray-600 hover:text-gray-900 transition-colors duration-200"
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        Back to Trip
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCart className="w-8 h-8 shrink-0 text-blue-600" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Shopping Cart</h1>
            <p className="text-gray-600">
              Importing to <span className="font-medium">{trip.name}</span>
            </p>
          </div>
        </div>

        {/* Selection controls */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-t border-gray-200 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="min-h-11 px-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="min-h-11 px-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
            >
              Deselect All
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{selectedCount}</span> of {importItems.length} items
            selected
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {importItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No items to import</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {importItems.map((item) => (
              // The whole row is the checkbox's label, so tapping anywhere toggles it
              <label
                key={item.id}
                className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer transition-colors duration-200 ${
                  item.selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleItem(item.id)}
                  className="h-6 w-6 flex-shrink-0 cursor-pointer accent-blue-600"
                />

                <ItemThumbnail
                  imageUrl={item.imageUrl}
                  name={item.name || 'Product'}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg"
                  iconClassName="w-7 h-7"
                />

                {/* Item details (spans: this is all inside the checkbox's label) */}
                <span className="block flex-grow min-w-0">
                  <span className="block font-medium text-gray-900 truncate">
                    {item.name || 'Unnamed Item'}
                  </span>
                  {item.brand && (
                    <span className="block text-sm text-gray-600 truncate">{item.brand}</span>
                  )}
                  {item.description && (
                    <span className="block text-sm text-gray-600 truncate mt-1">{item.description}</span>
                  )}
                </span>

                {/* Quantity and Price */}
                <span className="block text-right flex-shrink-0">
                  <span className="block font-medium text-gray-900">
                    {formatPrice(item.price, item.currency)}
                  </span>
                  {(item.quantity || 1) > 1 && (
                    <span className="block text-sm text-gray-600">Qty: {item.quantity}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Footer with import button */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        {importError && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {importError}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </p>
            <p className="text-lg font-bold text-gray-900">
              Total: {formatPrice(selectedTotal, trip.budgetCurrency)}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              to={`/app/trip/${tripId}`}
              className="flex-1 sm:flex-none inline-flex min-h-11 items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="flex-1 sm:flex-none min-h-11 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {importing ? (
                <>
                  <div className="motion-safe:animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" aria-hidden="true" />
                  Import {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
