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

export interface UpdateShoppingListItemInput {
  name?: string;
  quantity?: number;
  price?: number;
  currency?: string;
  category?: string;
  priority?: PriorityLevel;
  purchaseLocation?: string;
  brand?: string;
  notes?: string;
  purchased?: boolean;
  // Purchase tracking fields
  purchasePrice?: number;
  purchaseCurrency?: string;
  purchaseDate?: Date;
  actualPurchaseLocation?: string;
  imageUrl?: string;
  description?: string;
  productUrl?: string;
}
