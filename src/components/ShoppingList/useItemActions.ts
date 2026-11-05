import { useState } from 'react';
import type { ShoppingListItem } from '../../types/ShoppingList';
import { showError } from '../../utils/toast';
import { celebrateSaving, showCoins } from '../../utils/confetti';

interface ItemActionHandlers {
  onTogglePurchased: (itemId: string, purchased: boolean) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onSaveForLater: (itemId: string, savedForLater: boolean) => Promise<void>;
}

/** What the list row and the tile both do with an item, and the dialogs they open. */
export function useItemActions(item: ShoppingListItem, { onTogglePurchased, onDelete, onSaveForLater }: ItemActionHandlers) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const togglePurchased = async () => {
    try {
      // Marking as bought asks for the actual price; un-marking needs no questions.
      if (!item.purchased) {
        setIsPurchaseModalOpen(true);
      } else {
        await onTogglePurchased(item.id, false);
      }
    } catch {
      showError('Failed to update item');
    }
  };

  const deleteItem = async () => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await onDelete(item.id);
      } catch {
        showError('Failed to delete item');
      }
    }
  };

  const toggleSavedForLater = async () => {
    try {
      const savingForLater = !item.savedForLater;
      await onSaveForLater(item.id, savingForLater);
      if (savingForLater) {
        celebrateSaving(); // Confetti for saving money
      } else {
        showCoins(); // Gold coins for spending more
      }
    } catch {
      showError('Failed to update item');
    }
  };

  return {
    togglePurchased,
    deleteItem,
    toggleSavedForLater,
    isImageModalOpen,
    openImage: () => setIsImageModalOpen(true),
    closeImage: () => setIsImageModalOpen(false),
    isPurchaseModalOpen,
    closePurchaseModal: () => setIsPurchaseModalOpen(false),
  };
}
