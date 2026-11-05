import { ArrowUpDown, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { Modal } from '../Shared/Modal';

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
  const selectedRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Sort"
        aria-haspopup="dialog"
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:border-gray-400 transition-colors duration-200"
      >
        <ArrowUpDown className="w-4 h-4" aria-hidden="true" />
        <span className="font-medium hidden sm:inline">Sort</span>
      </button>

      {isOpen && (
        <Modal title="Sort by" size="sm" onClose={() => setIsOpen(false)} initialFocusRef={selectedRef} bodyClassName="py-2">
          <ul>
            {SORT_OPTIONS.map((option) => {
              const selected = sortBy === option.value;
              return (
                <li key={option.value}>
                  <button
                    ref={selected ? selectedRef : undefined}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onSortChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 sm:px-6 text-left transition-colors duration-200 ${
                      selected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                    {selected && <Check className="w-5 h-5 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </>
  );
}
