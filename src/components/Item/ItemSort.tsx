import { ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

export type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'brand-asc' | 'brand-desc' | 'priority-asc' | 'priority-desc' | 'date-newest' | 'date-oldest';

interface ItemSortProps {
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date-newest', label: 'Date (Newest)' },
  { value: 'date-oldest', label: 'Date (Oldest)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'brand-asc', label: 'Brand (A-Z)' },
  { value: 'brand-desc', label: 'Brand (Z-A)' },
  { value: 'price-asc', label: 'Price (Low-High)' },
  { value: 'price-desc', label: 'Price (High-Low)' },
  { value: 'priority-asc', label: 'Priority (Low-High)' },
  { value: 'priority-desc', label: 'Priority (High-Low)' },
];

export function ItemSort({ sortBy, onSortChange }: ItemSortProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:border-gray-400 transition-all duration-200"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="font-medium hidden sm:inline">Sort</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
            <div className="px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase">Sort by</p>
            </div>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${
                  sortBy === option.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
