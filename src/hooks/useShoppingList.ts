import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../services/firebase';
import type { ShoppingListItem, CreateShoppingListItemInput, UpdateShoppingListItemInput } from '../types/ShoppingList';
import { useExchangeRate } from './useExchangeRate';
import { convertCurrency } from '../utils/currency';
import { SERVER_GRACE_MS, isAwaitingServer, toDate } from '../utils/firestore';
import { toStorableImageUrl, toStorableLinkUrl } from '../utils/url';

// Every item keeps these; any other field is removed when updated to null.
const REQUIRED_FIELDS = new Set(['name', 'quantity', 'price', 'currency', 'purchased']);

interface ItemsSnapshot {
  tripId: string;
  items: ShoppingListItem[];
  fromCache: boolean;
  /** False while cache-only data waits for the server (see SERVER_GRACE_MS). */
  settled: boolean;
  error: string | null;
}

const NO_ITEMS: ShoppingListItem[] = [];

function toItem(id: string, data: DocumentData): ShoppingListItem {
  return {
    id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    purchaseDate: data.purchaseDate instanceof Timestamp ? data.purchaseDate.toDate() : undefined,
  } as ShoppingListItem;
}

export function useShoppingList(tripId: string | null) {
  const [snapshot, setSnapshot] = useState<ItemsSnapshot | null>(null);
  const { rates } = useExchangeRate();

  useEffect(() => {
    if (!tripId) return;

    const q = query(
      collection(db, `trips/${tripId}/shoppingList`),
      orderBy('createdAt', 'desc')
    );

    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        clearTimeout(graceTimer);
        // Estimate server timestamps of pending (e.g. offline) writes instead of reading null.
        const items = snap.docs.map((d) => toItem(d.id, d.data({ serverTimestamps: 'estimate' })));
        const { fromCache } = snap.metadata;
        const awaitingServer = isAwaitingServer(fromCache);

        setSnapshot((prev) => ({
          tripId,
          items,
          fromCache,
          settled: (prev?.tripId === tripId && prev.settled) || !awaitingServer,
          error: null,
        }));

        if (awaitingServer) {
          graceTimer = setTimeout(() => {
            setSnapshot((prev) =>
              prev && prev.tripId === tripId && !prev.settled ? { ...prev, settled: true } : prev
            );
          }, SERVER_GRACE_MS);
        }
      },
      (err) => {
        clearTimeout(graceTimer);
        console.error('Error fetching shopping list:', err);
        setSnapshot((prev) => ({
          tripId,
          items: prev?.tripId === tripId ? prev.items : NO_ITEMS,
          fromCache: prev?.tripId === tripId ? prev.fromCache : false,
          settled: true,
          error: 'Failed to load shopping list',
        }));
      }
    );

    return () => {
      clearTimeout(graceTimer);
      unsubscribe();
    };
  }, [tripId]);

  // Only trust data that belongs to the current trip.
  const current = tripId && snapshot?.tripId === tripId ? snapshot : null;
  const items = current?.items ?? NO_ITEMS;
  const loading = !!tripId && !current?.settled;
  const fromCache = current?.fromCache ?? false;
  const error = current?.error ?? null;

  // Generate a new item ID without creating the document
  // Use this when you need to upload an image before creating the item
  const generateItemId = (): string => {
    if (!tripId) throw new Error('Trip ID is required');
    // Create a document reference to get an auto-generated ID
    const newDocRef = doc(collection(db, `trips/${tripId}/shoppingList`));
    return newDocRef.id;
  };

  const addItem = async (itemData: CreateShoppingListItemInput, preGeneratedId?: string) => {
    if (!tripId) throw new Error('Trip ID is required');

    try {
      // Calculate USD price and store exchange rate
      const priceUSD = itemData.currency === 'USD'
        ? itemData.price
        : convertCurrency(itemData.price, itemData.currency, 'USD', rates);

      const exchangeRateUsed = rates && itemData.currency !== 'USD' && rates[itemData.currency]
        ? rates[itemData.currency]
        : null;

      // Clean up empty optional fields
      // Ensure quantity is an integer (Firestore rules require `quantity is int`)
      // Truncate strings to comply with Firestore rules
      const cleanedData: DocumentData = {
        name: (itemData.name || 'Unnamed Item').slice(0, 500),
        quantity: Math.max(1, Math.floor(Number(itemData.quantity) || 1)),
        price: Math.max(0, Number(itemData.price) || 0),
        currency: (itemData.currency || 'USD').slice(0, 3),
        priceUSD,
        purchased: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add optional fields only if they have values (not null/undefined/empty string)
      // Apply length limits per Firestore rules
      if (exchangeRateUsed !== null && exchangeRateUsed !== undefined) cleanedData.exchangeRateUsed = exchangeRateUsed;
      if (itemData.category) cleanedData.category = itemData.category;
      if (itemData.priority !== undefined) cleanedData.priority = itemData.priority;
      if (itemData.purchaseLocation) cleanedData.purchaseLocation = itemData.purchaseLocation;
      if (itemData.brand) cleanedData.brand = itemData.brand.slice(0, 100);
      if (itemData.notes) cleanedData.notes = itemData.notes.slice(0, 5000);
      if (itemData.description) cleanedData.description = itemData.description.slice(0, 500);
      // Rules only accept https:// images and http(s):// links; drop anything else.
      const imageUrl = toStorableImageUrl(itemData.imageUrl);
      if (imageUrl) cleanedData.imageUrl = imageUrl;
      else if (itemData.imageUrl) console.warn('Ignoring unsupported image URL:', itemData.imageUrl);
      const productUrl = toStorableLinkUrl(itemData.productUrl);
      if (productUrl) cleanedData.productUrl = productUrl;
      else if (itemData.productUrl) console.warn('Ignoring unsupported product URL:', itemData.productUrl);

      if (preGeneratedId) {
        // Use setDoc with the pre-generated ID (for items with uploaded images)
        await setDoc(doc(db, `trips/${tripId}/shoppingList`, preGeneratedId), cleanedData);
      } else {
        // Use addDoc for auto-generated ID (for items without uploaded images)
        await addDoc(collection(db, `trips/${tripId}/shoppingList`), cleanedData);
      }
    } catch (err) {
      console.error('Error adding item:', err);
      throw new Error('Failed to add item');
    }
  };

  const updateItem = async (itemId: string, updates: UpdateShoppingListItemInput) => {
    if (!tripId) throw new Error('Trip ID is required');

    // Undefined fields are left as they are; null removes an optional field. URL fields are
    // never written as empty strings (the rules require a web URL whenever they're present).
    const cleanedUpdates: DocumentData = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (value === null) {
        if (!REQUIRED_FIELDS.has(key)) cleanedUpdates[key] = deleteField();
        continue;
      }

      // Apply type coercion and length limits based on field
      switch (key) {
        case 'quantity':
          cleanedUpdates[key] = Math.max(1, Math.floor(Number(value) || 1));
          break;
        case 'price':
        case 'purchasePrice':
          cleanedUpdates[key] = Math.max(0, Number(value) || 0);
          break;
        case 'name':
          cleanedUpdates[key] = String(value).slice(0, 500);
          break;
        case 'brand':
          cleanedUpdates[key] = String(value).slice(0, 100);
          break;
        case 'notes':
          cleanedUpdates[key] = String(value).slice(0, 5000);
          break;
        case 'description':
          cleanedUpdates[key] = String(value).slice(0, 500);
          break;
        case 'currency':
        case 'purchaseCurrency':
          cleanedUpdates[key] = String(value).slice(0, 3);
          break;
        case 'imageUrl':
        case 'productUrl': {
          const raw = String(value);
          if (!raw.trim()) {
            cleanedUpdates[key] = deleteField();
            break;
          }
          const url = key === 'imageUrl' ? toStorableImageUrl(raw) : toStorableLinkUrl(raw);
          if (!url) {
            throw new Error(
              key === 'imageUrl'
                ? 'Image links must start with https://'
                : 'Product links must start with http:// or https://'
            );
          }
          cleanedUpdates[key] = url;
          break;
        }
        default:
          cleanedUpdates[key] = value;
      }
    }

    try {
      // Recalculate USD price if price or currency changed
      const needsRecalculation = updates.price !== undefined || updates.currency !== undefined;
      let priceUSD: number | null = null;
      let exchangeRateUsed: number | null = null;

      if (needsRecalculation) {
        // Get the current item to access fields that weren't updated
        const currentItem = items.find(item => item.id === itemId);
        if (!currentItem) throw new Error('Item not found');

        const finalPrice = updates.price ?? currentItem.price;
        const finalCurrency = updates.currency ?? currentItem.currency;

        priceUSD = finalCurrency === 'USD'
          ? finalPrice
          : convertCurrency(finalPrice, finalCurrency, 'USD', rates);

        exchangeRateUsed = rates && finalCurrency !== 'USD' && rates[finalCurrency]
          ? rates[finalCurrency]
          : null;
      }

      // Build the final update object
      const finalUpdate: DocumentData = {
        ...cleanedUpdates,
        updatedAt: serverTimestamp(),
      };

      // Add recalculated fields only if they're not null
      if (needsRecalculation) {
        if (priceUSD !== null) finalUpdate.priceUSD = priceUSD;
        if (exchangeRateUsed !== null) finalUpdate.exchangeRateUsed = exchangeRateUsed;
      }

      await updateDoc(doc(db, `trips/${tripId}/shoppingList`, itemId), finalUpdate);
    } catch (err) {
      console.error('Error updating item:', err);
      throw new Error('Failed to update item');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!tripId) throw new Error('Trip ID is required');

    try {
      const userId = auth.currentUser?.uid;

      // Delete the image from storage if it exists
      const item = items.find(i => i.id === itemId);
      if (item?.imageUrl && userId) {
        try {
          // Use correct path: images/{userId}/{itemId}/original
          const imageRef = ref(storage, `images/${userId}/${itemId}/original`);
          await deleteObject(imageRef);
        } catch (imgErr) {
          // Don't fail the entire operation if image deletion fails
          console.error('Error deleting image:', imgErr);
        }
      }

      // Delete the item from Firestore
      await deleteDoc(doc(db, `trips/${tripId}/shoppingList`, itemId));
    } catch (err) {
      console.error('Error deleting item:', err);
      throw new Error('Failed to delete item');
    }
  };

  const togglePurchased = async (itemId: string, purchased: boolean) => {
    await updateItem(itemId, { purchased });
  };

  const saveForLater = async (itemId: string, savedForLater: boolean) => {
    await updateItem(itemId, { savedForLater });
  };

  return {
    items,
    loading,
    fromCache,
    error,
    generateItemId,
    addItem,
    updateItem,
    deleteItem,
    togglePurchased,
    saveForLater,
  };
}
