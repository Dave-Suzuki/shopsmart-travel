import { useState, useMemo, useEffect, useId } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { CreateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation, TripCategory } from '../../types/Trip';
import { DEFAULT_CATEGORIES } from '../../constants/categories';
import { ImageUpload } from '../Shared/ImageUpload';
import { Modal } from '../Shared/Modal';
import { PriorityPicker } from './PriorityPicker';
import { useImageUpload } from '../../hooks/useImageUpload';
import { toHttps } from '../../utils/url';
import { showError } from '../../utils/toast';
import { URLFetchButton } from '../Item/AddItem/URLFetchButton';

// Data structure for pre-filling form from external sources (Chrome extension, deep links)
export interface ItemInitialData {
  name?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  category?: string;
  brand?: string;
  imageUrl?: string;
  description?: string;
  productUrl?: string;
  notes?: string;
}

interface AddShoppingItemProps {
  onAddItem: (item: CreateShoppingListItemInput, preGeneratedId?: string) => Promise<void>;
  generateItemId?: () => string;
  defaultCurrency: string;
  tripLocations?: TripLocation[];
  tripCategories?: TripCategory[];
  // Optional props for external control (deep linking)
  initialData?: ItemInitialData;
  externalIsOpen?: boolean;
  onExternalClose?: () => void;
}

interface ScrapedProduct {
  name?: string;
  image?: string;
  description?: string;
  price?: number;
  currency?: string;
  brand?: string;
  error?: string;
}

const INPUT_CLASS =
  'w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function toFormData(defaultCurrency: string, data?: ItemInitialData): CreateShoppingListItemInput {
  // Only keep web image URLs (as https), e.g. from the extension
  const rawImageUrl = data?.imageUrl?.trim();
  const imageUrl = rawImageUrl && rawImageUrl.startsWith('http') ? toHttps(rawImageUrl) : '';

  return {
    name: data?.name || '',
    quantity: data?.quantity || 1,
    price: data?.price || 0,
    currency: data?.currency || defaultCurrency,
    category: data?.category || '',
    priority: 3,
    purchaseLocation: '',
    brand: data?.brand || '',
    notes: data?.notes || '',
    imageUrl: imageUrl || '',
    description: data?.description || '',
    productUrl: data?.productUrl || '',
  };
}

/** Pre-filled data with a product link but no name, price or brand: fetch the rest from the page. */
function needsAutoFetch(data?: ItemInitialData): boolean {
  const hasMissingData = !data?.name || !data.price || !data.brand;
  return !!data && hasMissingData && !!data.productUrl?.startsWith('http');
}

export function AddShoppingItem({ externalIsOpen, onExternalClose, ...dialogProps }: AddShoppingItemProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided (deep links), otherwise internal
  const isControlledExternally = externalIsOpen !== undefined;
  const isOpen = isControlledExternally ? externalIsOpen : internalIsOpen;
  const close = () => {
    if (isControlledExternally) onExternalClose?.();
    else setInternalIsOpen(false);
  };

  return (
    <>
      {/* Only show trigger button when not externally controlled */}
      {!isControlledExternally && (
        <button
          type="button"
          onClick={() => setInternalIsOpen(true)}
          className="flex min-h-11 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          Add Item
        </button>
      )}

      {/* Mounted only while open, so every opening starts from a fresh (or pre-filled) form */}
      {isOpen && <AddItemDialog {...dialogProps} onClose={close} />}
    </>
  );
}

type AddItemDialogProps = Omit<AddShoppingItemProps, 'externalIsOpen' | 'onExternalClose'> & {
  onClose: () => void;
};

function AddItemDialog({
  onAddItem,
  generateItemId,
  defaultCurrency,
  tripLocations = [],
  tripCategories = DEFAULT_CATEGORIES,
  initialData,
  onClose,
}: AddItemDialogProps) {
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [autoFetching, setAutoFetching] = useState(() => needsAutoFetch(initialData));
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const { uploadImage, uploading } = useImageUpload();
  const [formData, setFormData] = useState<CreateShoppingListItemInput>(() => toFormData(defaultCurrency, initialData));

  // A deep link with a product link but missing details: fetch them from the product page.
  useEffect(() => {
    if (!initialData || !needsAutoFetch(initialData)) return;
    let cancelled = false;
    console.log('Auto-fetching missing product data from:', initialData.productUrl);

    const scrapeProductInfo = httpsCallable<{ url: string }, ScrapedProduct>(getFunctions(), 'scrapeProductInfo');
    scrapeProductInfo({ url: initialData.productUrl! })
      .then((result) => {
        const data = result.data;
        if (cancelled || data.error) return;
        console.log('Auto-fetched data:', data);
        setFormData((prev) => ({
          ...prev,
          // Only fill in missing fields, don't override what extension already provided
          name: prev.name || data.name || '',
          price: prev.price || data.price || 0,
          brand: prev.brand || data.brand || '',
          description: prev.description || data.description || '',
          imageUrl: prev.imageUrl || toHttps(data.image) || '',
          currency: prev.currency || data.currency || defaultCurrency,
        }));
      })
      .catch((err) => {
        console.error('Auto-fetch failed:', err);
      })
      .finally(() => {
        if (!cancelled) setAutoFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialData, defaultCurrency]);

  // Currencies from the trip's locations, the budget, and the form's current currency (e.g. one
  // fetched from a product page), so the selected currency is always one of the options
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    currencies.add(defaultCurrency); // Add budget currency
    if (formData.currency) currencies.add(formData.currency);
    tripLocations.forEach(loc => {
      if (loc.currency) {
        currencies.add(loc.currency);
      }
    });
    return Array.from(currencies).sort();
  }, [tripLocations, defaultCurrency, formData.currency]);

  const isValidImageUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  const handleURLDataFetched = (data: {
    name?: string;
    imageUrl?: string;
    description?: string;
    price?: number;
    currency?: string;
    brand?: string;
    productUrl?: string;
  }) => {
    console.log('URL fetch data received:', data);

    setFormData((prev) => ({
      ...prev,
      ...(data.name && { name: data.name }),
      ...(data.imageUrl && isValidImageUrl(data.imageUrl) && { imageUrl: data.imageUrl }),
      ...(data.description && { description: data.description }),
      ...(data.price !== undefined && !isNaN(data.price) && { price: data.price }),
      // Use fetched currency if valid, otherwise keep the current currency (budget currency)
      ...(data.currency && { currency: data.currency }),
      ...(data.brand && { brand: data.brand }),
      ...(data.productUrl && { productUrl: data.productUrl }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        showError('Please enter an item name');
        setLoading(false);
        return;
      }

      // Ensure price is a valid number and quantity is an integer
      const price = isNaN(formData.price) ? 0 : formData.price;
      const quantity = isNaN(formData.quantity) || formData.quantity < 1 ? 1 : Math.floor(formData.quantity);

      let imageUrl: string | undefined = formData.imageUrl;
      let itemId: string | undefined;

      // If we have an image to upload, generate the item ID first
      // This ensures the image path matches the final item ID
      if (selectedImage && generateItemId) {
        itemId = generateItemId();
        imageUrl = await uploadImage(selectedImage, itemId);
      }

      console.log('Submitting item:', {
        ...formData,
        price,
        quantity,
        imageUrl,
        itemId,
      });

      await onAddItem({
        ...formData,
        price,
        quantity,
        imageUrl,
      }, itemId);

      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
      const errorMessage = (error instanceof Error && error.message) || 'Failed to add item. Please try again.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Shopping Item"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-11 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={loading || uploading}
            className="flex-1 min-h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {uploading ? 'Uploading...' : loading ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {autoFetching && (
          <div role="status" className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
            <span>Fetching product details...</span>
          </div>
        )}

        <div className="pb-4 border-b border-gray-200">
          <URLFetchButton onDataFetched={handleURLDataFetched} />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <input
            type="text"
            id="name"
            required
            maxLength={500}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 500) })}
            className={INPUT_CLASS}
            placeholder="e.g., Sunscreen"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              required
              min="1"
              max="10000"
              value={formData.quantity}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                const validQuantity = isNaN(value) || value < 1 ? 1 : Math.min(value, 10000);
                setFormData({ ...formData, quantity: validQuantity });
              }}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <input
              type="number"
              id="price"
              required
              min="0"
              step="0.01"
              inputMode="decimal"
              value={formData.price}
              onFocus={(e) => {
                // Select all text when focused, so typing replaces it
                e.target.select();
              }}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const validPrice = isNaN(value) || value < 0 ? 0 : value;
                setFormData({ ...formData, price: validPrice });
              }}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className={INPUT_CLASS}
            >
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="">Select category</option>
              {tripCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Location
          </label>
          <select
            id="location"
            value={formData.purchaseLocation}
            onChange={(e) => setFormData({ ...formData, purchaseLocation: e.target.value })}
            className={INPUT_CLASS}
          >
            <option value="">Select location</option>
            {tripLocations.map((loc, index) => (
              <option key={index} value={loc.name}>
                {loc.name}
              </option>
            ))}
            <option value="Online">🌐 Online</option>
          </select>
        </div>

        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
            Brand / Store
          </label>
          <input
            type="text"
            id="brand"
            value={formData.brand || ''}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className={INPUT_CLASS}
            placeholder="e.g., Nike, Amazon, Zara"
          />
        </div>

        <PriorityPicker
          value={formData.priority}
          onChange={(priority) => setFormData({ ...formData, priority })}
        />

        {formData.description && (
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              maxLength={500}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 500) })}
              className={INPUT_CLASS}
              rows={2}
              placeholder="Product description (auto-filled from URL)"
            />
          </div>
        )}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            maxLength={5000}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, 5000) })}
            className={INPUT_CLASS}
            rows={2}
            placeholder="Any additional notes..."
          />
        </div>

        {formData.imageUrl && !selectedImage && (
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">
              Product Image (from URL)
            </p>
            <div className="relative">
              <img
                src={toHttps(formData.imageUrl)}
                alt="Product preview"
                className="w-full h-48 object-cover rounded-lg border border-gray-300"
                onError={() => {
                  // Clear imageUrl if it fails to load so user can upload manually
                  setFormData(prev => ({ ...prev, imageUrl: '' }));
                }}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                aria-label="Remove image"
                className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600">
                  <X className="w-4 h-4" aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>
        )}

        {!formData.imageUrl && (
          <ImageUpload
            onImageSelected={setSelectedImage}
          />
        )}
      </form>
    </Modal>
  );
}
