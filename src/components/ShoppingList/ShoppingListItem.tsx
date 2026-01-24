import { useState } from 'react';
import { Trash2, Tag, Edit, MapPin, DollarSign, ExternalLink } from 'lucide-react';
import type { ShoppingListItem as Item, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation } from '../../types/Trip';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import { formatCurrency } from '../../utils/currency';
import { toHttps } from '../../utils/url';
import { ImageModal } from '../Shared/ImageModal';
import { PurchaseRecordModal } from './PurchaseRecordModal';

interface ShoppingListItemProps {
  item: Item;
  onTogglePurchased: (itemId: string, purchased: boolean) => Promise<void>;
  onUpdateItem: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (item: Item) => void;
  tripLocations?: TripLocation[];
  budgetCurrency: string;
}

export function ShoppingListItem({ item, onTogglePurchased, onUpdateItem, onDelete, onEdit, tripLocations = [], budgetCurrency }: ShoppingListItemProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const handleToggle = async () => {
    try {
      // If marking as purchased, open the purchase modal
      if (!item.purchased) {
        setIsPurchaseModalOpen(true);
      } else {
        // If marking as not purchased, just toggle directly
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
    <div className={`bg-white rounded-lg shadow-sm border ${item.purchased ? 'border-green-200 bg-green-50' : 'border-gray-200'} p-3 sm:p-4 transition-colors duration-200`}>
      <div className="flex items-start gap-2 sm:gap-3">
        <input
          type="checkbox"
          checked={item.purchased}
          onChange={handleToggle}
          className="mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
        />

        {item.imageUrl && (
          <div
            className="flex-shrink-0 cursor-pointer hover:opacity-75 transition-opacity duration-200"
            onClick={() => setIsImageModalOpen(true)}
          >
            <img
              src={toHttps(item.imageUrl)}
              alt={item.name}
              className="w-10 h-10 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h4 className={`font-medium text-sm sm:text-base ${item.purchased ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {item.name}
                </h4>
                {priorityInfo && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white border"
                    style={{ borderColor: priorityInfo.color, color: priorityInfo.color }}
                    title={priorityInfo.label}
                  >
                    {priorityInfo.icon}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2 mt-1 flex-wrap">
                {item.brand && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    {item.brand}
                  </span>
                )}
                {item.category && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{item.category}</span>
                  </div>
                )}
                {item.purchaseLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {item.purchaseLocation === 'Online' ? '🌐 ' : ''}{item.purchaseLocation}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => onEdit(item)}
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors duration-200"
                title="Edit item"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors duration-200"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2 text-xs sm:text-sm">
            <span className="text-gray-600">Qty: {item.quantity}</span>
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <span className="font-medium text-gray-900">
                {formatCurrency(item.price * item.quantity, item.currency)}
              </span>
              {item.priceUSD && item.currency !== 'USD' && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <DollarSign className="w-3 h-3" />
                  <span>
                    {formatCurrency(item.priceUSD * item.quantity, 'USD')} USD
                  </span>
                </div>
              )}
            </div>
          </div>

          {item.description && (
            <div className="hidden sm:block mt-2 text-sm text-gray-600">
              {item.description.length > 150 && !showFullDescription ? (
                <>
                  <p>{item.description.substring(0, 150)}...</p>
                  <button
                    onClick={() => setShowFullDescription(true)}
                    className="text-blue-500 hover:text-blue-700 text-xs font-medium mt-1"
                  >
                    Show more
                  </button>
                </>
              ) : (
                <>
                  <p>{item.description}</p>
                  {item.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(false)}
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium mt-1"
                    >
                      Show less
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {item.productUrl && (
            <a
              href={item.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex mt-2 items-center gap-1 text-sm text-purple-600 hover:text-purple-700 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View product page</span>
            </a>
          )}

          {item.notes && (
            <p className="hidden sm:block mt-2 text-sm text-gray-500 italic">{item.notes}</p>
          )}
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
