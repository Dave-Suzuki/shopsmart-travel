import { useId } from 'react';
import { Trash2, Pencil, ExternalLink, Bookmark, RotateCcw } from 'lucide-react';
import type { ShoppingListItem as Item, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation } from '../../types/Trip';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import { formatCurrency } from '../../utils/currency';
import { toHttps } from '../../utils/url';
import { ImageModal } from '../Shared/ImageModal';
import { PurchaseRecordModal } from './PurchaseRecordModal';
import { ItemThumbnail } from './ItemThumbnail';
import { useItemActions } from './useItemActions';

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

const ACTION_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200';

export function ShoppingListItemTile({ item, onTogglePurchased, onUpdateItem, onDelete, onEdit, onSaveForLater, tripLocations = [], budgetCurrency }: ShoppingListItemTileProps) {
  const actions = useItemActions(item, { onTogglePurchased, onDelete, onSaveForLater });
  const nameId = useId();

  const priorityInfo = item.priority ? PRIORITY_LEVELS.find((p) => p.level === item.priority) : null;
  const total = item.price * item.quantity;
  const totalUSD = item.priceUSD && item.currency !== 'USD' ? item.priceUSD * item.quantity : null;

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-md border ${item.purchased ? 'border-green-200 bg-green-50' : 'border-gray-200'} overflow-hidden transition-shadow duration-200 hover:shadow-lg`}>
      {/* Image Section */}
      <div className="relative">
        <ItemThumbnail
          imageUrl={item.imageUrl}
          name={item.name}
          className="block h-28 w-full sm:h-48"
          iconClassName="h-10 w-10 sm:h-16 sm:w-16 text-gray-300"
          onOpen={actions.openImage}
          imageClassName="motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-105"
        />

        {/* Checkbox overlay: 44px tap area around a 24px box */}
        <label className="absolute left-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/90 shadow-md">
            <input
              type="checkbox"
              checked={item.purchased}
              onChange={actions.togglePurchased}
              aria-label={`Bought: ${item.name}`}
              className="h-6 w-6 cursor-pointer accent-green-600"
            />
          </span>
        </label>

        {/* Priority badge */}
        {priorityInfo && (
          <div
            className="pointer-events-none absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs sm:text-sm font-medium bg-white shadow-md border"
            style={{ borderColor: priorityInfo.color, color: priorityInfo.color }}
          >
            <span aria-hidden="true">{priorityInfo.icon}</span>
            <span className="sr-only">{priorityInfo.label}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-2 sm:p-4">
        <h3
          id={nameId}
          className={`font-semibold text-sm sm:text-base line-clamp-2 ${item.purchased ? 'line-through text-gray-500' : 'text-gray-900'}`}
        >
          {item.name}
        </h3>
        {item.brand && (
          <span className="mt-1 self-start inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            {item.brand}
          </span>
        )}

        {/* Price */}
        <div className="mt-1.5 sm:mt-2">
          <div className="text-base sm:text-lg font-bold text-gray-900">
            {formatCurrency(total, item.currency)}
          </div>
          {totalUSD !== null && (
            <div className="text-xs text-gray-500">≈ {formatCurrency(totalUSD, 'USD')}</div>
          )}
          <div className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</div>
        </div>

        {/* Product URL */}
        {item.productUrl && (
          <a
            href={item.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start inline-flex min-h-11 items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            <span>View product</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}

        {/* Action Buttons */}
        <div className="mt-auto flex justify-between sm:justify-center sm:gap-2 pt-1 sm:pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label="Edit item"
            aria-describedby={nameId}
            className={`${ACTION_BUTTON} text-blue-600 hover:bg-blue-50`}
          >
            <Pencil className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={actions.toggleSavedForLater}
            aria-label={item.savedForLater ? 'Restore to list' : 'Save for later'}
            aria-describedby={nameId}
            className={`${ACTION_BUTTON} ${
              item.savedForLater ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'
            }`}
          >
            {item.savedForLater ? (
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Bookmark className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={actions.deleteItem}
            aria-label="Delete item"
            aria-describedby={nameId}
            className={`${ACTION_BUTTON} text-red-600 hover:bg-red-50`}
          >
            <Trash2 className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {item.imageUrl && (
        <ImageModal
          imageUrl={toHttps(item.imageUrl)!}
          altText={item.name}
          isOpen={actions.isImageModalOpen}
          onClose={actions.closeImage}
        />
      )}

      <PurchaseRecordModal
        item={item}
        isOpen={actions.isPurchaseModalOpen}
        onClose={actions.closePurchaseModal}
        onSave={onUpdateItem}
        tripLocations={tripLocations}
        budgetCurrency={budgetCurrency}
      />
    </div>
  );
}
