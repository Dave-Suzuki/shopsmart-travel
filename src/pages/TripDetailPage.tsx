import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, DollarSign, LayoutList, LayoutGrid } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { useShoppingList } from '../hooks/useShoppingList';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { convertCurrency } from '../utils/currency';
import { AddShoppingItem, type ItemInitialData } from '../components/ShoppingList/AddShoppingItem';
import { ShoppingListItem } from '../components/ShoppingList/ShoppingListItem';
import { ShoppingListItemTile } from '../components/ShoppingList/ShoppingListItemTile';
import { EditShoppingItem } from '../components/ShoppingList/EditShoppingItem';
import { ShoppingSummary } from '../components/ShoppingList/ShoppingSummary';
import { ItemFilter, type ItemFilters } from '../components/Item/ItemFilter';
import { ItemSort, type SortOption } from '../components/Item/ItemSort';
import { ExchangeRateIndicator } from '../components/Currency/ExchangeRateIndicator';
import type { ShoppingListItem as Item } from '../types/ShoppingList';

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { trips } = useTrips(user?.uid || null);
  const { items, loading, generateItemId, addItem, updateItem, deleteItem, togglePurchased } = useShoppingList(tripId || null);
  const { rates } = useExchangeRate();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [filters, setFilters] = useState<ItemFilters>({ status: 'all' });
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('list');
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');

  // Deep linking state for AddShoppingItem modal
  const [deepLinkModalOpen, setDeepLinkModalOpen] = useState(false);
  const [deepLinkInitialData, setDeepLinkInitialData] = useState<ItemInitialData | undefined>(undefined);

  // Handle deep link query params for adding items
  useEffect(() => {
    const addItemParam = searchParams.get('addItem');
    const itemDataParam = searchParams.get('itemData');

    if (addItemParam === 'true') {
      let initialData: ItemInitialData | undefined;

      if (itemDataParam) {
        try {
          // Decode base64 and parse JSON
          const decoded = atob(itemDataParam);
          initialData = JSON.parse(decoded);
        } catch (e) {
          console.error('Failed to parse itemData param:', e);
        }
      }

      setDeepLinkInitialData(initialData);
      setDeepLinkModalOpen(true);

      // Clear the URL params without reloading
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('addItem');
      newParams.delete('itemData');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Close deep link modal handler
  const handleDeepLinkModalClose = useCallback(() => {
    setDeepLinkModalOpen(false);
    setDeepLinkInitialData(undefined);
  }, []);

  const trip = trips.find((t) => t.id === tripId);

  // Extract unique brands
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    items.forEach(item => {
      if (item.brand) {
        brands.add(item.brand);
      }
    });
    return Array.from(brands).sort();
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    // Filter items
    let filtered = items.filter(item => {
      // Status filter
      if (filters.status === 'purchased' && !item.purchased) return false;
      if (filters.status === 'pending' && item.purchased) return false;

      // Location filter
      if (filters.purchaseLocation && item.purchaseLocation !== filters.purchaseLocation) return false;

      // Category filter
      if (filters.category && item.category !== filters.category) return false;

      // Priority filter
      if (filters.priority !== undefined && item.priority !== filters.priority) return false;

      // Brand filter
      if (filters.brand && item.brand !== filters.brand) return false;

      return true;
    });

    // Sort items
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'brand-asc':
          return (a.brand || '').localeCompare(b.brand || '');
        case 'brand-desc':
          return (b.brand || '').localeCompare(a.brand || '');
        case 'price-asc':
          return (a.price * a.quantity) - (b.price * b.quantity);
        case 'price-desc':
          return (b.price * b.quantity) - (a.price * a.quantity);
        case 'priority-asc':
          return (a.priority || 3) - (b.priority || 3);
        case 'priority-desc':
          return (b.priority || 3) - (a.priority || 3);
        case 'date-oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'date-newest':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return sorted;
  }, [items, filters, sortBy]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
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

  const totalSpent = items.reduce((sum, item) => {
    // Convert item price to budget currency
    const itemPrice = item.currency === trip.budgetCurrency
      ? item.price
      : convertCurrency(item.price, item.currency, trip.budgetCurrency, rates);

    return sum + (itemPrice * item.quantity);
  }, 0);

  const purchasedCount = items.filter((item) => item.purchased).length;
  const totalItems = items.length;

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-200"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Trips
      </button>

      {/* Trip Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{trip.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-5 h-5" />
            <span>{trip.destination}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <span>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="font-medium">
                Budget: {trip.budgetCurrency} {trip.budget.toLocaleString()}
              </span>
              <span className="text-sm">
                Spent: {trip.budgetCurrency} {totalSpent.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Budget Progress</span>
            <span>{((totalSpent / trip.budget) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                totalSpent > trip.budget ? 'bg-red-600' : 'bg-green-600'
              }`}
              style={{ width: `${Math.min((totalSpent / trip.budget) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Shopping Summary */}
      <ShoppingSummary items={items} budgetCurrency={trip.budgetCurrency} />

      {/* Shopping List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shopping List</h2>
            <p className="text-gray-600 mt-1">
              {purchasedCount} of {totalItems} items purchased
              {filteredAndSortedItems.length !== items.length && (
                <span className="ml-2 text-blue-600">
                  ({filteredAndSortedItems.length} shown)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List view"
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('tile')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'tile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Tile view"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Tiles</span>
              </button>
            </div>
            <ItemSort
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
            <ItemFilter
              filters={filters}
              onFilterChange={setFilters}
              tripLocations={trip.locations}
              tripCategories={trip.categories}
              availableBrands={availableBrands}
            />
            <AddShoppingItem
              onAddItem={addItem}
              generateItemId={generateItemId}
              defaultCurrency={trip.budgetCurrency}
              tripLocations={trip.locations}
              tripCategories={trip.categories}
            />
          </div>
        </div>

        {/* Exchange Rate Indicator */}
        <div className="mb-4">
          <ExchangeRateIndicator />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">No items yet</p>
            <AddShoppingItem onAddItem={addItem} generateItemId={generateItemId} defaultCurrency={trip.budgetCurrency} />
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">No items match the current filters</p>
            <button
              onClick={() => setFilters({ status: 'all' })}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredAndSortedItems.map((item) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                onTogglePurchased={togglePurchased}
                onUpdateItem={updateItem}
                onDelete={deleteItem}
                onEdit={setEditingItem}
                tripLocations={trip.locations}
                budgetCurrency={trip.budgetCurrency}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedItems.map((item) => (
              <ShoppingListItemTile
                key={item.id}
                item={item}
                onTogglePurchased={togglePurchased}
                onUpdateItem={updateItem}
                onDelete={deleteItem}
                onEdit={setEditingItem}
                tripLocations={trip.locations}
                budgetCurrency={trip.budgetCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {editingItem && (
        <EditShoppingItem
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onUpdateItem={updateItem}
          tripLocations={trip.locations}
          budgetCurrency={trip.budgetCurrency}
          tripCategories={trip.categories}
        />
      )}

      {/* Deep link modal for Chrome extension / external add */}
      {deepLinkModalOpen && (
        <AddShoppingItem
          onAddItem={addItem}
          generateItemId={generateItemId}
          defaultCurrency={trip.budgetCurrency}
          tripLocations={trip.locations}
          tripCategories={trip.categories}
          initialData={deepLinkInitialData}
          externalIsOpen={deepLinkModalOpen}
          onExternalClose={handleDeepLinkModalClose}
        />
      )}
    </div>
  );
}
