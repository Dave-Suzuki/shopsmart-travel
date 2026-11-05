import type { TripCategory } from '../types/Trip';

export const CATEGORIES = [
  { value: 'Clothing', label: 'Clothing', icon: '👔' },
  { value: 'Electronics', label: 'Electronics', icon: '📱' },
  { value: 'Toiletries', label: 'Toiletries', icon: '🧴' },
  { value: 'Cosmetics', label: 'Cosmetics', icon: '💄' },
  { value: 'Souvenirs', label: 'Souvenirs', icon: '🎁' },
  { value: 'Food', label: 'Food', icon: '🍫' },
  { value: 'Books', label: 'Books', icon: '📚' },
  { value: 'Accessories', label: 'Accessories', icon: '👜' },
  { value: 'Health', label: 'Health', icon: '💊' },
  { value: 'Other', label: 'Other', icon: '📦' },
] as const;

export type Category = typeof CATEGORIES[number]['value'];

/** The categories a trip starts with (and that trips without their own list use). */
export const DEFAULT_CATEGORIES: TripCategory[] = CATEGORIES.map((category) => ({ ...category }));
