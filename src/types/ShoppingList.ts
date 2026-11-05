import type { PriorityLevel } from '../constants/priorities';

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  currency: string;
  priceUSD?: number; // Auto-calculated USD conversion
  exchangeRateUsed?: number; // Exchange rate used for conversion
  category?: string;
  priority?: PriorityLevel;
  purchaseLocation?: string;
  brand?: string; // Brand or store name
  purchased: boolean;
  savedForLater?: boolean; // Item is saved for later, not in main list
  // Purchase tracking fields
  purchasePrice?: number; // Actual price paid
  purchaseCurrency?: string; // Currency actually paid in
  purchaseDate?: Date; // When item was purchased
  actualPurchaseLocation?: string; // Where item was actually bought
  notes?: string;
  imageUrl?: string;
  description?: string;
  productUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShoppingListItemInput {
  name: string;
  quantity: number;
  price: number;
  currency: string;
  category?: string;
  priority?: PriorityLevel;
  purchaseLocation?: string;
  brand?: string;
  notes?: string;
  imageUrl?: string;
  description?: string;
  productUrl?: string;
}

// Fields left undefined are unchanged. Optional fields can be set to null to remove them.
export interface UpdateShoppingListItemInput {
  name?: string;
  quantity?: number;
  price?: number;
  currency?: string;
  category?: string | null;
  priority?: PriorityLevel | null;
  purchaseLocation?: string | null;
  brand?: string | null;
  notes?: string | null;
  purchased?: boolean;
  savedForLater?: boolean | null;
  // Purchase tracking fields
  purchasePrice?: number | null;
  purchaseCurrency?: string | null;
  purchaseDate?: Date | null;
  actualPurchaseLocation?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  productUrl?: string | null;
}
