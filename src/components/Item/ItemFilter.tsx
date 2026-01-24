import { Filter, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import type { PriorityLevel } from '../../constants/priorities';
import type { TripLocation, TripCategory } from '../../types/Trip';

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

export function ItemFilter({ filters, onFilterChange, tripLocations = [], tripCategories = CATEGORIES as any as TripCategory[], availableBrands = [] }: ItemFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = filters.category || filters.priority || filters.purchaseLocation || filters.brand || (filters.status && filters.status !== 'all');

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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
          hasActiveFilters
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span className="font-medium">Filter</span>
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {[filters.category, filters.priority, filters.purchaseLocation, filters.brand, filters.status !== 'all' && filters.status].filter(Boolean).length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Filter Items</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'purchased', label: 'Purchased' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => onFilterChange({ ...filters, status: status.value as ItemFilters['status'] })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        (filters.status || 'all') === status.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="filter-location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  id="filter-location"
                  value={filters.purchaseLocation || ''}
                  onChange={(e) => onFilterChange({ ...filters, purchaseLocation: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All categories</option>
                  {tripCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="flex gap-1 justify-between">
                  <button
                    onClick={() => onFilterChange({ ...filters, priority: undefined })}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all duration-200 ${
                      !filters.priority
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    All
                  </button>
                  {PRIORITY_LEVELS.map((p) => (
                    <button
                      key={p.level}
                      onClick={() => onFilterChange({ ...filters, priority: p.level })}
                      className={`flex-1 flex flex-col items-center px-1 py-1 rounded-lg border-2 transition-all duration-200 ${
                        filters.priority === p.level
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={p.label}
                    >
                      <span className="text-lg">{p.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
