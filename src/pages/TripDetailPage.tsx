import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, DollarSign, LayoutList, LayoutGrid, ShoppingCart, Search, Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { useShoppingList } from '../hooks/useShoppingList';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { computeBudget } from '../utils/budget';
import { decodePayload } from '../utils/payload';
import { AddShoppingItem, type ItemInitialData } from '../components/ShoppingList/AddShoppingItem';
import { ShoppingListItem } from '../components/ShoppingList/ShoppingListItem';
import { ShoppingListItemTile } from '../components/ShoppingList/ShoppingListItemTile';
import { ShoppingListItemSkeletonList } from '../components/ShoppingList/ShoppingListItemSkeleton';
import { ShoppingListItemTileSkeletonGrid } from '../components/ShoppingList/ShoppingListItemTileSkeleton';
import { EditShoppingItem } from '../components/ShoppingList/EditShoppingItem';
import { ShoppingSummary } from '../components/ShoppingList/ShoppingSummary';
import { EmptyState } from '../components/Shared/EmptyState';
import { OnboardingTooltip } from '../components/Shared/OnboardingTooltip';
import { ItemFilter, type ItemFilters } from '../components/Item/ItemFilter';
import { ItemSort, type SortOption } from '../components/Item/ItemSort';
import { ExchangeRateIndicator } from '../components/Currency/ExchangeRateIndicator';
import type { ShoppingListItem as Item } from '../types/ShoppingList';

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { trips, loading: tripsLoading, fromCache: tripsFromCache } = useTrips(user?.uid || null);
  const { items, loading, generateItemId, addItem, updateItem, deleteItem, togglePurchased, saveForLater } = useShoppingList(tripId || null);
  const { rates } = useExchangeRate();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [filters, setFilters] = useState<ItemFilters>({ status: 'all' });
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('tile');
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [showSavedForLater, setShowSavedForLater] = useState(false);

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
        // UTF-8 base64url JSON from the extension (older standard-base64 links work too)
        const decoded = decodePayload(itemDataParam);
        if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
          initialData = decoded as ItemInitialData;
        } else {
          console.error('Failed to parse itemData param');
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

  // Separate active items from saved-for-later items
  const activeItems = useMemo(() => items.filter(item => !item.savedForLater), [items]);
  const savedForLaterItems = useMemo(() => items.filter(item => item.savedForLater), [items]);

  const filteredAndSortedItems = useMemo(() => {
    // Filter active items (not saved for later)
    const filtered = activeItems.filter(item => {
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
  }, [activeItems, filters, sortBy]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
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

  // Saved-for-later items are left out of the budget
  const budget = computeBudget(items, trip.budget, trip.budgetCurrency, rates);
  const formatAmount = (amount: number) =>
    `${trip.budgetCurrency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const purchasedCount = activeItems.filter((item) => item.purchased).length;
  const totalItems = activeItems.length;

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/app')}
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
                {budget.usedPct === null
                  ? 'No budget set'
                  : `Budget: ${trip.budgetCurrency} ${trip.budget.toLocaleString()}`}
              </span>
              <span className="text-sm">Spent: {formatAmount(budget.spent)}</span>
              <span className="text-sm">To buy: {formatAmount(budget.toBuy)}</span>
              {budget.usedPct !== null && (
                <span className={`text-sm ${budget.free < 0 ? 'text-red-600 font-medium' : ''}`}>
                  {budget.free < 0
                    ? `Over budget by ${formatAmount(-budget.free)}`
                    : `Free: ${formatAmount(budget.free)}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Budget Progress Bar: spent plus still to buy, against the budget */}
        {budget.usedPct !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Budget used (spent + to buy)</span>
              <span>{budget.usedPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  budget.free < 0 ? 'bg-red-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(budget.usedPct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Shopping Summary */}
      <ShoppingSummary items={activeItems} budget={trip.budget} budgetCurrency={trip.budgetCurrency} />

      {/* Shopping List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shopping List</h2>
            <p className="text-gray-600 mt-1">
              {purchasedCount} of {totalItems} items purchased
              {filteredAndSortedItems.length !== activeItems.length && (
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
            <OnboardingTooltip
              tipId="add-item"
              message="Add items you want to buy during your trip. Include prices to track your budget!"
              position="left"
              showCondition={items.length === 0 && !loading}
            >
              <AddShoppingItem
                onAddItem={addItem}
                generateItemId={generateItemId}
                defaultCurrency={trip.budgetCurrency}
                tripLocations={trip.locations}
                tripCategories={trip.categories}
              />
            </OnboardingTooltip>
          </div>
        </div>

        {/* Exchange Rate Indicator */}
        <div className="mb-4">
          <ExchangeRateIndicator />
        </div>

        {loading && items.length === 0 ? (
          viewMode === 'list' ? (
            <ShoppingListItemSkeletonList count={5} />
          ) : (
            <ShoppingListItemTileSkeletonGrid count={6} />
          )
        ) : activeItems.length === 0 && savedForLaterItems.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Your shopping list is empty"
            description="Add items you want to buy during your trip"
          >
            <AddShoppingItem
              onAddItem={addItem}
              generateItemId={generateItemId}
              defaultCurrency={trip.budgetCurrency}
              tripLocations={trip.locations}
              tripCategories={trip.categories}
            />
          </EmptyState>
        ) : activeItems.length === 0 && savedForLaterItems.length > 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bookmark className="w-12 h-12 mx-auto mb-3 text-amber-400" />
            <p className="text-lg font-medium">All items are saved for later</p>
            <p className="text-sm mt-1">Expand the section below to view them</p>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No items match your filters"
            description="Try adjusting your filters to see more items"
            actionLabel="Clear Filters"
            onAction={() => setFilters({ status: 'all' })}
          />
        ) : viewMode === 'list' ? (
          <div className="space-y-2 sm:space-y-3">
            {filteredAndSortedItems.map((item) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                onTogglePurchased={togglePurchased}
                onUpdateItem={updateItem}
                onDelete={deleteItem}
                onEdit={setEditingItem}
                onSaveForLater={saveForLater}
                tripLocations={trip.locations}
                budgetCurrency={trip.budgetCurrency}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {filteredAndSortedItems.map((item) => (
              <ShoppingListItemTile
                key={item.id}
                item={item}
                onTogglePurchased={togglePurchased}
                onUpdateItem={updateItem}
                onDelete={deleteItem}
                onEdit={setEditingItem}
                onSaveForLater={saveForLater}
                tripLocations={trip.locations}
                budgetCurrency={trip.budgetCurrency}
              />
            ))}
          </div>
        )}

        {/* Saved for Later Section */}
        {savedForLaterItems.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <button
              onClick={() => setShowSavedForLater(!showSavedForLater)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              <Bookmark className="w-5 h-5 text-amber-500" />
              <span className="font-semibold">Saved for Later ({savedForLaterItems.length})</span>
              {showSavedForLater ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showSavedForLater && (
              <div className="mt-4">
                {viewMode === 'list' ? (
                  <div className="space-y-2 sm:space-y-3">
                    {savedForLaterItems.map((item) => (
                      <ShoppingListItem
                        key={item.id}
                        item={item}
                        onTogglePurchased={togglePurchased}
                        onUpdateItem={updateItem}
                        onDelete={deleteItem}
                        onEdit={setEditingItem}
                        onSaveForLater={saveForLater}
                        tripLocations={trip.locations}
                        budgetCurrency={trip.budgetCurrency}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {savedForLaterItems.map((item) => (
                      <ShoppingListItemTile
                        key={item.id}
                        item={item}
                        onTogglePurchased={togglePurchased}
                        onUpdateItem={updateItem}
                        onDelete={deleteItem}
                        onEdit={setEditingItem}
                        onSaveForLater={saveForLater}
                        tripLocations={trip.locations}
                        budgetCurrency={trip.budgetCurrency}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
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
