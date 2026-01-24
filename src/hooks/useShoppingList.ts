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
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../services/firebase';
import type { ShoppingListItem, CreateShoppingListItemInput, UpdateShoppingListItemInput } from '../types/ShoppingList';
import { useExchangeRate } from './useExchangeRate';
import { convertCurrency } from '../utils/currency';

export function useShoppingList(tripId: string | null) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { rates } = useExchangeRate();

  useEffect(() => {
    if (!tripId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `trips/${tripId}/shoppingList`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const itemsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Handle null timestamps (can happen with serverTimestamp() before sync)
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
            // Handle optional date fields
            purchaseDate: data.purchaseDate ? (data.purchaseDate as Timestamp).toDate() : undefined,
          } as ShoppingListItem;
        });
        setItems(itemsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching shopping list:', err);
        setError('Failed to load shopping list');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tripId]);

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
      const cleanedData: Record<string, any> = {
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
      if (itemData.imageUrl) cleanedData.imageUrl = itemData.imageUrl;
      if (itemData.description) cleanedData.description = itemData.description.slice(0, 500);
      if (itemData.productUrl) cleanedData.productUrl = itemData.productUrl;

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

      // Filter out undefined values and apply Firestore validation rules
      const cleanedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          // Apply type coercion and length limits based on field
          switch (key) {
            case 'quantity':
              acc[key] = Math.max(1, Math.floor(Number(value) || 1));
              break;
            case 'price':
            case 'purchasePrice':
              acc[key] = Math.max(0, Number(value) || 0);
              break;
            case 'name':
              acc[key] = String(value).slice(0, 500);
              break;
            case 'brand':
              acc[key] = String(value).slice(0, 100);
              break;
            case 'notes':
              acc[key] = String(value).slice(0, 5000);
              break;
            case 'description':
              acc[key] = String(value).slice(0, 500);
              break;
            case 'currency':
            case 'purchaseCurrency':
              acc[key] = String(value).slice(0, 3);
              break;
            default:
              acc[key] = value;
          }
        }
        return acc;
      }, {} as Record<string, any>);

      // Build the final update object
      const finalUpdate: Record<string, any> = {
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

  return {
    items,
    loading,
    error,
    generateItemId,
    addItem,
    updateItem,
    deleteItem,
    togglePurchased,
  };
}
