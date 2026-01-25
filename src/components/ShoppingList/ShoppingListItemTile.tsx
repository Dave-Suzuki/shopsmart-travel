import { useState } from 'react';
import { Trash2, Tag, Edit, DollarSign, ExternalLink, Bookmark, RotateCcw } from 'lucide-react';
import type { ShoppingListItem as Item, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation } from '../../types/Trip';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import { formatCurrency } from '../../utils/currency';
import { toHttps } from '../../utils/url';
import { showError } from '../../utils/toast';
import { celebrateSaving, showCoins } from '../../utils/confetti';
import { ImageModal } from '../Shared/ImageModal';
import { PurchaseRecordModal } from './PurchaseRecordModal';

interface ShoppingListItemTileProps {
  item: Item;
  onTogglePurchased: (itemId: string, purchased: boolean) => Promise<void>;
  onUpdateItem: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (item: Item) => void;
  onSaveForLater: (itemId: string, savedForLater: boolean) => Promise<void>;
  tripLocations?: TripLocation[];
  budgetCurrency: string;
}

export function ShoppingListItemTile({ item, onTogglePurchased, onUpdateItem, onDelete, onEdit, onSaveForLater, tripLocations = [], budgetCurrency }: ShoppingListItemTileProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const handleToggle = async () => {
    try {
      if (!item.purchased) {
        setIsPurchaseModalOpen(true);
      } else {
        await onTogglePurchased(item.id, false);
      }
    } catch (error) {
      showError('Failed to update item');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await onDelete(item.id);
      } catch (error) {
        showError('Failed to delete item');
      }
    }
  };

  const handleSaveForLater = async () => {
    try {
      const savingForLater = !item.savedForLater;
      await onSaveForLater(item.id, savingForLater);
      // Trigger confetti effects
      if (savingForLater) {
        celebrateSaving(); // Green confetti for saving money
      } else {
        showCoins(); // Gold coins for spending more
      }
    } catch (error) {
      showError('Failed to update item');
    }
  };

  const priorityInfo = item.priority ? PRIORITY_LEVELS.find(p => p.level === item.priority) : null;

  return (
    <div className={`bg-white rounded-lg shadow-md border ${item.purchased ? 'border-green-200 bg-green-50' : 'border-gray-200'} overflow-hidden transition-all duration-200 hover:shadow-lg`}>
      {/* Image Section */}
      <div className="relative">
        {item.imageUrl ? (
          <div
            className="w-full h-28 sm:h-48 cursor-pointer overflow-hidden bg-gray-100"
            onClick={() => setIsImageModalOpen(true)}
          >
            <img
              src={toHttps(item.imageUrl)}
              alt={item.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </div>
        ) : (
          <div className="w-full h-28 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Tag className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300" />
          </div>
        )}

        {/* Checkbox overlay */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
          <input
            type="checkbox"
            checked={item.purchased}
            onChange={handleToggle}
            className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 border-2 border-white rounded focus:ring-green-500 cursor-pointer shadow-md"
          />
        </div>

        {/* Priority badge */}
        {priorityInfo && (
          <div
            className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs sm:text-sm font-medium bg-white shadow-md border"
            style={{ borderColor: priorityInfo.color, color: priorityInfo.color }}
            title={priorityInfo.label}
          >
            {priorityInfo.icon}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2.5 sm:p-4">
        {/* Title and Brand */}
        <div className="mb-1.5 sm:mb-2">
          <h4 className={`font-semibold text-sm sm:text-base mb-0.5 sm:mb-1 line-clamp-1 ${item.purchased ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {item.name}
          </h4>
          {item.brand && (
            <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              {item.brand}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-2 sm:mb-3">
          <div className="text-sm sm:text-lg font-bold text-gray-900">
            {formatCurrency(item.price * item.quantity, item.currency)}
          </div>
          {item.priceUSD && item.currency !== 'USD' && (
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-600">
              <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{formatCurrency(item.priceUSD * item.quantity, 'USD')} USD</span>
            </div>
          )}
          <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Qty: {item.quantity}</div>
        </div>

        {/* Product URL */}
        {item.productUrl && (
          <a
            href={item.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-purple-600 hover:text-purple-700 hover:underline"
          >
            <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>View product</span>
          </a>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 pt-2 sm:pt-3 border-t border-gray-200">
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={handleSaveForLater}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              item.savedForLater
                ? 'text-green-600 hover:bg-green-50'
                : 'text-amber-600 hover:bg-amber-50'
            }`}
            title={item.savedForLater ? 'Restore to list' : 'Save for later'}
          >
            {item.savedForLater ? (
              <RotateCcw className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {item.imageUrl && (
        <ImageModal
          imageUrl={toHttps(item.imageUrl)!}
          altText={item.name}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}

      <PurchaseRecordModal
        item={item}
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSave={onUpdateItem}
        tripLocations={tripLocations}
        budgetCurrency={budgetCurrency}
      />
    </div>
  );
}
