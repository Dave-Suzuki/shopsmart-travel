import { useId } from 'react';
import { Trash2, Pencil, Bookmark, RotateCcw } from 'lucide-react';
import type { ShoppingListItem as Item, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation } from '../../types/Trip';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import { formatCurrency } from '../../utils/currency';
import { toHttps } from '../../utils/url';
import { ImageModal } from '../Shared/ImageModal';
import { ActionMenu } from '../Shared/ActionMenu';
import { PurchaseRecordModal } from './PurchaseRecordModal';
import { ItemThumbnail } from './ItemThumbnail';
import { useItemActions } from './useItemActions';

interface ShoppingListItemProps {
  item: Item;
  onTogglePurchased: (itemId: string, purchased: boolean) => Promise<void>;
  onUpdateItem: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (item: Item) => void;
  onSaveForLater: (itemId: string, savedForLater: boolean) => Promise<void>;
  tripLocations?: TripLocation[];
  budgetCurrency: string;
}

/**
 * One compact row of the list view (about 72px): checkbox, photo, name and details, price,
 * and a "More actions" menu. Tapping the name opens the item (description, notes and the
 * product link live there).
 */
export function ShoppingListItem({ item, onTogglePurchased, onUpdateItem, onDelete, onEdit, onSaveForLater, tripLocations = [], budgetCurrency }: ShoppingListItemProps) {
  const actions = useItemActions(item, { onTogglePurchased, onDelete, onSaveForLater });
  const nameId = useId();
  const detailsId = useId();

  const priorityInfo = item.priority ? PRIORITY_LEVELS.find((p) => p.level === item.priority) : null;
  const details = [
    item.quantity > 1 && `Qty ${item.quantity}`,
    priorityInfo && `${priorityInfo.icon} ${priorityInfo.label}`,
    item.brand,
    item.purchaseLocation && (item.purchaseLocation === 'Online' ? '🌐 Online' : item.purchaseLocation),
  ]
    .filter(Boolean)
    .join(' · ');

  const total = item.price * item.quantity;
  const totalUSD = item.priceUSD && item.currency !== 'USD' ? item.priceUSD * item.quantity : null;

  return (
    <li
      className={`flex min-h-[72px] items-center gap-1 py-1 pl-1 sm:px-2 transition-colors duration-200 ${
        item.purchased ? 'bg-green-50' : ''
      }`}
    >
      {/* 44px tap area around a 24px box */}
      <label className="-ml-0.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={item.purchased}
          onChange={actions.togglePurchased}
          aria-label={`Bought: ${item.name}`}
          className="h-6 w-6 cursor-pointer accent-green-600"
        />
      </label>

      <ItemThumbnail
        imageUrl={item.imageUrl}
        name={item.name}
        className="h-12 w-12 rounded-lg"
        onOpen={actions.openImage}
      />

      <button
        type="button"
        onClick={() => onEdit(item)}
        aria-label={`Edit ${item.name}`}
        aria-describedby={details ? detailsId : undefined}
        className="min-w-0 flex-1 self-stretch rounded-lg py-0.5 pl-2 pr-1 text-left transition-colors duration-200 hover:bg-gray-100/70"
      >
        <span
          id={nameId}
          className={`line-clamp-2 text-base font-medium leading-tight ${
            item.purchased ? 'text-gray-500 line-through' : 'text-gray-900'
          }`}
        >
          {item.name}
        </span>
        {details && (
          <span id={detailsId} className="mt-0.5 block truncate text-[13px] leading-snug text-gray-500">
            {details}
          </span>
        )}
      </button>

      <div className="shrink-0 pl-1 text-right">
        <p className={`text-base font-semibold leading-snug ${item.purchased ? 'text-gray-500' : 'text-gray-900'}`}>
          {formatCurrency(total, item.currency)}
        </p>
        {totalUSD !== null && (
          <p className="text-[13px] leading-snug text-gray-500">≈ {formatCurrency(totalUSD, 'USD')}</p>
        )}
      </div>

      <ActionMenu
        label="More actions"
        describedBy={nameId}
        items={[
          { label: 'Edit', icon: Pencil, onSelect: () => onEdit(item) },
          item.savedForLater
            ? { label: 'Restore to list', icon: RotateCcw, onSelect: actions.toggleSavedForLater }
            : { label: 'Save for later', icon: Bookmark, onSelect: actions.toggleSavedForLater },
          { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: actions.deleteItem },
        ]}
      />

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
    </li>
  );
}
