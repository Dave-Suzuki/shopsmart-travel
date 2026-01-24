import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { useShoppingList } from '../hooks/useShoppingList';
import type { CreateShoppingListItemInput } from '../types/ShoppingList';
import type { ItemInitialData } from '../components/ShoppingList/AddShoppingItem';

interface ImportItem extends ItemInitialData {
  id: string; // Temporary ID for tracking selection
  selected: boolean;
}

export function BulkImportPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { trips } = useTrips(user?.uid || null);
  const { addItem } = useShoppingList(tripId || null);

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
        // Decode base64 and parse JSON array
        const decoded = atob(itemsParam);
        const items: ItemInitialData[] = JSON.parse(decoded);

        if (!Array.isArray(items)) {
          throw new Error('Expected an array of items');
        }

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

  // Calculate total price of selected items
  const selectedTotal = useMemo(() => {
    return importItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  }, [importItems]);

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
        navigate(`/trip/${tripId}`);
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
    const curr = currency || trip?.budgetCurrency || 'USD';
    return `${curr} ${price.toFixed(2)}`;
  };

  if (!trip && trips.length > 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Trip not found</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Trips
        </button>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading trip...</p>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/trip/${tripId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Trip
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Error</h2>
          <p className="text-gray-600 mb-6">{parseError}</p>
          <button
            onClick={() => navigate(`/trip/${tripId}`)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            Return to Shopping List
          </button>
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
      <button
        onClick={() => navigate(`/trip/${tripId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-200"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Trip
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Shopping Cart</h1>
            <p className="text-gray-600">
              Importing to <span className="font-medium">{trip.name}</span>
            </p>
          </div>
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleAll(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="text-sm text-gray-600 hover:text-gray-700 font-medium"
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
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-center gap-4 p-4 cursor-pointer transition-colors duration-200 ${
                  item.selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                    item.selected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {item.selected && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Image */}
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name || 'Product'}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                {/* Item details */}
                <div className="flex-grow min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {item.name || 'Unnamed Item'}
                  </h3>
                  {item.brand && (
                    <p className="text-sm text-gray-500 truncate">{item.brand}</p>
                  )}
                  {item.description && (
                    <p className="text-sm text-gray-400 truncate mt-1">{item.description}</p>
                  )}
                </div>

                {/* Quantity and Price */}
                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-gray-900">
                    {formatPrice(item.price, item.currency)}
                  </p>
                  {(item.quantity || 1) > 1 && (
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with import button */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {importError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {importError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </p>
            <p className="text-lg font-bold text-gray-900">
              Total: {formatPrice(selectedTotal, trip.budgetCurrency)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/trip/${tripId}`)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
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
