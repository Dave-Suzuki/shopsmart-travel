export interface StoreLocation {
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Item {
  id: string;
  tripId: string;
  name: string;
  description: string;
  url: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  plannedPrice: number;
  plannedCurrency: string;
  plannedPriceUSD: number;
  actualPrice: number | null;
  actualCurrency: string | null;
  actualPriceUSD: number | null;
  savings: number | null;
  purchaseLocation: string;
  category: string;
  subcategory: string | null;
  storeName: string | null;
  storeAddress: string | null;
  storeLocation: StoreLocation | null;
  priority: 1 | 2 | 3 | 4 | 5;
  priorityIcon: string;
  priorityLabel: string;
  checked: boolean;
  checkedAt: Date | null;
  purchaseNotes: string | null;
  storeType: 'physical' | 'online';
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
