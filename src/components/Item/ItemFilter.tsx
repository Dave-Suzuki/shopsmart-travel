import { Filter } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_CATEGORIES } from '../../constants/categories';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import type { PriorityLevel } from '../../constants/priorities';
import type { TripLocation, TripCategory } from '../../types/Trip';
import { Modal } from '../Shared/Modal';

export interface ItemFilters {
  category?: string;
  priority?: PriorityLevel;
  purchaseLocation?: string;
  brand?: string;
  status?: 'all' | 'purchased' | 'pending';
}

interface ItemFilterProps {
  filters: ItemFilters;
  onFilterChange: (filters: ItemFilters) => void;
  tripLocations?: TripLocation[];
  tripCategories?: TripCategory[];
  availableBrands?: string[];
}

const STATUS_OPTIONS: { value: NonNullable<ItemFilters['status']>; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'purchased', label: 'Purchased' },
];

const SELECT_CLASS =
  'w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const toggleClass = (selected: boolean) =>
  `min-h-11 rounded-lg border-2 text-sm font-medium transition-colors duration-200 ${
    selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
  }`;

export function ItemFilter({ filters, onFilterChange, tripLocations = [], tripCategories = DEFAULT_CATEGORIES, availableBrands = [] }: ItemFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = [
    filters.category,
    filters.priority,
    filters.purchaseLocation,
    filters.brand,
    filters.status && filters.status !== 'all',
  ].filter(Boolean).length;
  const hasActiveFilters = activeCount > 0;

  const clearFilters = () => {
    onFilterChange({
      category: undefined,
      priority: undefined,
      purchaseLocation: undefined,
      brand: undefined,
      status: 'all',
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-label={hasActiveFilters ? `Filter, ${activeCount} active` : 'Filter'}
        className={`flex min-h-11 items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border-2 transition-colors duration-200 ${
          hasActiveFilters
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <Filter className="w-4 h-4" aria-hidden="true" />
        <span className="font-medium">Filter</span>
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <Modal
          title="Filter Items"
          size="sm"
          onClose={() => setIsOpen(false)}
          footer={
            <div className="flex gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex-1 min-h-11 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 min-h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <fieldset className="min-w-0">
              <legend className="block text-sm font-medium text-gray-700 mb-2">Status</legend>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((status) => {
                  const selected = (filters.status || 'all') === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onFilterChange({ ...filters, status: status.value })}
                      className={`px-2 ${toggleClass(selected)}`}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="filter-location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                id="filter-location"
                value={filters.purchaseLocation || ''}
                onChange={(e) => onFilterChange({ ...filters, purchaseLocation: e.target.value || undefined })}
                className={SELECT_CLASS}
              >
                <option value="">All locations</option>
                {tripLocations.map((loc, index) => (
                  <option key={index} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
                <option value="Online">🌐 Online</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-brand" className="block text-sm font-medium text-gray-700 mb-2">
                Brand / Store
              </label>
              <select
                id="filter-brand"
                value={filters.brand || ''}
                onChange={(e) => onFilterChange({ ...filters, brand: e.target.value || undefined })}
                className={SELECT_CLASS}
              >
                <option value="">All brands</option>
                {availableBrands.map((brand, index) => (
                  <option key={index} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="filter-category"
                value={filters.category || ''}
                onChange={(e) => onFilterChange({ ...filters, category: e.target.value || undefined })}
                className={SELECT_CLASS}
              >
                <option value="">All categories</option>
                {tripCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="min-w-0">
              <legend className="block text-sm font-medium text-gray-700 mb-2">Priority</legend>
              <div className="grid grid-cols-6 gap-1">
                <button
                  type="button"
                  aria-pressed={!filters.priority}
                  onClick={() => onFilterChange({ ...filters, priority: undefined })}
                  className={`px-1 ${toggleClass(!filters.priority)}`}
                >
                  All
                </button>
                {PRIORITY_LEVELS.map((p) => (
                  <button
                    key={p.level}
                    type="button"
                    aria-label={p.label}
                    aria-pressed={filters.priority === p.level}
                    onClick={() => onFilterChange({ ...filters, priority: p.level })}
                    className={`flex items-center justify-center ${toggleClass(filters.priority === p.level)}`}
                  >
                    <span className="text-lg" aria-hidden="true">{p.icon}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </Modal>
      )}
    </>
  );
}
