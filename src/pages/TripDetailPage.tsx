import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, DollarSign, LayoutList, LayoutGrid, ShoppingCart, Search, Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { useShoppingList } from '../hooks/useShoppingList';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { computeBudget } from '../utils/budget';
import { formatCurrency } from '../utils/currency';
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

/** Reads the extension's itemData param (UTF-8 base64url JSON; older standard-base64 links work too). */
function parseItemData(param: string | null): ItemInitialData | undefined {
  if (!param) return undefined;
  const decoded = decodePayload(param);
  return decoded && typeof decoded === 'object' && !Array.isArray(decoded) ? (decoded as ItemInitialData) : undefined;
}

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
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

  // Deep link (Chrome extension / external add): ?addItem=true&itemData=... opens Add Item
  // pre-filled. Each new link is captured into state while rendering, then removed from the URL.
  const deepLinkParams = searchParams.get('addItem') === 'true' ? searchParams.toString() : null;
  const [seenDeepLinkParams, setSeenDeepLinkParams] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<{ key: number; initialData?: ItemInitialData } | null>(null);
  if (deepLinkParams !== seenDeepLinkParams) {
    setSeenDeepLinkParams(deepLinkParams);
    if (deepLinkParams !== null) {
      const initialData = parseItemData(searchParams.get('itemData'));
      setDeepLink((prev) => ({ key: (prev?.key ?? 0) + 1, initialData }));
    }
  }

  // Clear the deep-link params from the URL without reloading
  useEffect(() => {
    if (searchParams.get('addItem') !== 'true') return;
    const itemDataParam = searchParams.get('itemData');
    if (itemDataParam && !parseItemData(itemDataParam)) {
      console.error('Failed to parse itemData param');
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('addItem');
    newParams.delete('itemData');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

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
  const formatAmount = (amount: number) => formatCurrency(amount, trip.budgetCurrency);

  const purchasedCount = activeItems.filter((item) => item.purchased).length;
  const totalItems = activeItems.length;
  // The empty state has its own "Add Item" button: show one primary action, not two.
  const showsEmptyState = !loading && items.length === 0;

  const itemHandlers = {
    onTogglePurchased: togglePurchased,
    onUpdateItem: updateItem,
    onDelete: deleteItem,
    onEdit: setEditingItem,
    onSaveForLater: saveForLater,
    tripLocations: trip.locations,
    budgetCurrency: trip.budgetCurrency,
  };

  const renderItems = (list: Item[]) =>
    viewMode === 'list' ? (
      // Full-bleed rows on phones
      <ul className="-mx-4 sm:mx-0 divide-y divide-gray-100 border-y border-gray-100">
        {list.map((item) => (
          <ShoppingListItem key={item.id} item={item} {...itemHandlers} />
        ))}
      </ul>
    ) : (
      // Two columns only where a tile still fits three 44px buttons (from 360px wide)
      <div className="-mx-2 sm:mx-0 grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
        {list.map((item) => (
          <ShoppingListItemTile key={item.id} item={item} {...itemHandlers} />
        ))}
      </div>
    );

  const addItemButton = (
    <AddShoppingItem
      onAddItem={addItem}
      generateItemId={generateItemId}
      defaultCurrency={trip.budgetCurrency}
      tripLocations={trip.locations}
      tripCategories={trip.categories}
    />
  );

  const viewButtonClass = (mode: 'list' | 'tile') =>
    `flex min-h-11 min-w-11 items-center justify-center gap-1 px-2 sm:px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
      viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <div className="max-w-7xl mx-auto">
      <Link
        to="/app"
        className="-ml-1 mb-3 sm:mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-gray-600 hover:text-gray-900 transition-colors duration-200"
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        Back to Trips
      </Link>

      {/* Trip Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 break-words">{trip.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{trip.destination}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </span>
          </div>

          <div className="flex items-start gap-2 text-gray-600">
            <DollarSign className="w-5 h-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="font-medium">
                {budget.usedPct === null
                  ? 'No budget set'
                  : `Budget: ${formatAmount(trip.budget)}`}
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
            <div className="w-full bg-gray-200 rounded-full h-2" aria-hidden="true">
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
      <section aria-labelledby="shopping-list-heading" className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="shopping-list-heading" className="text-xl sm:text-2xl font-bold text-gray-900">
            Shopping List
          </h2>
          {!showsEmptyState && addItemButton}
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {purchasedCount} of {totalItems} items purchased
          {filteredAndSortedItems.length !== activeItems.length && (
            <span className="text-blue-600"> · {filteredAndSortedItems.length} shown</span>
          )}
        </p>

        <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5" role="group" aria-label="View">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={viewButtonClass('list')}
            >
              <LayoutList className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tile')}
              aria-label="Tile view"
              aria-pressed={viewMode === 'tile'}
              className={viewButtonClass('tile')}
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Tile</span>
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
            <OnboardingTooltip
              tipId="add-item"
              message="Add items you want to buy during your trip. Include prices to track your budget!"
              position="bottom"
              showCondition={showsEmptyState}
            >
              {addItemButton}
            </OnboardingTooltip>
          </EmptyState>
        ) : activeItems.length === 0 && savedForLaterItems.length > 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bookmark className="w-12 h-12 mx-auto mb-3 text-amber-400" aria-hidden="true" />
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
        ) : (
          renderItems(filteredAndSortedItems)
        )}

        {/* Saved for Later Section */}
        {savedForLaterItems.length > 0 && (
          <div className="mt-6 sm:mt-8 border-t border-gray-200 pt-4 sm:pt-6">
            <button
              type="button"
              onClick={() => setShowSavedForLater(!showSavedForLater)}
              aria-expanded={showSavedForLater}
              aria-controls="saved-for-later"
              className="-ml-1 flex min-h-11 items-center gap-2 rounded-lg px-1 text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              <Bookmark className="w-5 h-5 text-amber-500" aria-hidden="true" />
              <span className="font-semibold">Saved for Later ({savedForLaterItems.length})</span>
              {showSavedForLater ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {showSavedForLater && (
              <div id="saved-for-later" className="mt-4">
                {renderItems(savedForLaterItems)}
              </div>
            )}
          </div>
        )}
      </section>

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
      {deepLink && (
        <AddShoppingItem
          key={deepLink.key}
          onAddItem={addItem}
          generateItemId={generateItemId}
          defaultCurrency={trip.budgetCurrency}
          tripLocations={trip.locations}
          tripCategories={trip.categories}
          initialData={deepLink.initialData}
          externalIsOpen
          onExternalClose={() => setDeepLink(null)}
        />
      )}
    </div>
  );
}
