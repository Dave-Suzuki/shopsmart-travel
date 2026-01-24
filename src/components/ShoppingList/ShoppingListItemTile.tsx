import { useState } from 'react';
import { Trash2, Tag, Edit, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import type { ShoppingListItem as Item, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation } from '../../types/Trip';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import { formatCurrency } from '../../utils/currency';
import { toHttps } from '../../utils/url';
import { ImageModal } from '../Shared/ImageModal';
import { PurchaseRecordModal } from './PurchaseRecordModal';

interface ShoppingListItemTileProps {
  item: Item;
  onTogglePurchased: (itemId: string, purchased: boolean) => Promise<void>;
  onUpdateItem: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (item: Item) => void;
  tripLocations?: TripLocation[];
  budgetCurrency: string;
}

export function ShoppingListItemTile({ item, onTogglePurchased, onUpdateItem, onDelete, onEdit, tripLocations = [], budgetCurrency }: ShoppingListItemTileProps) {
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
      alert('Failed to update item');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await onDelete(item.id);
      } catch (error) {
        alert('Failed to delete item');
      }
    }
  };

  const priorityInfo = item.priority ? PRIORITY_LEVELS.find(p => p.level === item.priority) : null;

  return (
    <div className={`bg-white rounded-lg shadow-md border ${item.purchased ? 'border-green-200 bg-green-50' : 'border-gray-200'} overflow-hidden transition-all duration-200 hover:shadow-lg`}>
      {/* Image Section */}
      <div className="relative">
        {item.imageUrl ? (
          <div
            className="w-full h-20 sm:h-48 cursor-pointer overflow-hidden bg-gray-100"
            onClick={() => setIsImageModalOpen(true)}
          >
            <img
              src={toHttps(item.imageUrl)}
              alt={item.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </div>
        ) : (
          <div className="w-full h-20 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Tag className="w-6 h-6 sm:w-16 sm:h-16 text-gray-300" />
          </div>
        )}

        {/* Checkbox overlay */}
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2">
          <input
            type="checkbox"
            checked={item.purchased}
            onChange={handleToggle}
            className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 border-2 border-white rounded focus:ring-green-500 cursor-pointer shadow-md"
          />
        </div>

        {/* Priority badge - hidden on mobile */}
        {priorityInfo && (
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded-md text-sm font-medium bg-white shadow-md border hidden sm:block"
            style={{ borderColor: priorityInfo.color, color: priorityInfo.color }}
            title={priorityInfo.label}
          >
            {priorityInfo.icon}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-1.5 sm:p-4">
        {/* Title and Brand */}
        <div className="mb-1 sm:mb-2">
          <h4 className={`font-semibold text-xs sm:text-base mb-0.5 sm:mb-1 line-clamp-1 ${item.purchased ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {item.name}
          </h4>
          {item.brand && (
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              {item.brand}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-1 sm:mb-3">
          <div className="text-xs sm:text-lg font-bold text-gray-900">
            {formatCurrency(item.price * item.quantity, item.currency)}
          </div>
          {item.priceUSD && item.currency !== 'USD' && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-blue-600">
              <DollarSign className="w-3 h-3" />
              <span>{formatCurrency(item.priceUSD * item.quantity, 'USD')} USD</span>
            </div>
          )}
          <div className="text-[10px] sm:text-xs text-gray-500">Qty: {item.quantity}</div>
        </div>

        {/* Meta Info - hidden on mobile to save space */}
        <div className="hidden sm:flex flex-wrap gap-2 mb-3 text-xs">
          {item.category && (
            <div className="flex items-center gap-1 text-gray-600">
              <Tag className="w-3 h-3" />
              <span>{item.category}</span>
            </div>
          )}
          {item.purchaseLocation && (
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="w-3 h-3" />
              <span>
                {item.purchaseLocation === 'Online' ? '🌐 ' : ''}{item.purchaseLocation}
              </span>
            </div>
          )}
        </div>

        {/* Description - hidden on mobile */}
        {item.description && (
          <p className="hidden sm:block text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Product URL - hidden on mobile */}
        {item.productUrl && (
          <a
            href={item.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:underline mb-3"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View product</span>
          </a>
        )}

        {/* Notes - hidden on mobile */}
        {item.notes && (
          <p className="hidden sm:block text-xs text-gray-500 italic mb-3 line-clamp-2">{item.notes}</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1 sm:gap-2 pt-1 sm:pt-3 border-t border-gray-200">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 flex items-center justify-center px-1 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
          >
            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline sm:ml-1">Edit</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center px-1 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline sm:ml-1">Delete</span>
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
