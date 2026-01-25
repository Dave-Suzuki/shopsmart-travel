import { useState, useMemo, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { CreateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation, TripCategory } from '../../types/Trip';
import { CATEGORIES } from '../../constants/categories';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import { ImageUpload } from '../Shared/ImageUpload';
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

export function AddShoppingItem({
  onAddItem,
  generateItemId,
  defaultCurrency,
  tripLocations = [],
  tripCategories = CATEGORIES as any as TripCategory[],
  initialData,
  externalIsOpen,
  onExternalClose,
}: AddShoppingItemProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided, otherwise internal
  const isControlledExternally = externalIsOpen !== undefined;
  const isOpen = isControlledExternally ? externalIsOpen : internalIsOpen;
  const setIsOpen = isControlledExternally
    ? (open: boolean) => { if (!open && onExternalClose) onExternalClose(); }
    : setInternalIsOpen;
  const [loading, setLoading] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const { uploadImage, uploading } = useImageUpload();

  const getInitialFormData = (data?: ItemInitialData): CreateShoppingListItemInput => ({
    name: data?.name || '',
    quantity: data?.quantity || 1,
    price: data?.price || 0,
    currency: data?.currency || defaultCurrency,
    category: data?.category || '',
    priority: 3,
    purchaseLocation: '',
    brand: data?.brand || '',
    notes: data?.notes || '',
    imageUrl: data?.imageUrl || '',
    description: data?.description || '',
    productUrl: data?.productUrl || '',
  });

  const [formData, setFormData] = useState<CreateShoppingListItemInput>(getInitialFormData(initialData));

  // Reset form when initialData changes (e.g., from deep link)
  // Also auto-fetch missing data if we have a productUrl but missing critical fields
  useEffect(() => {
    if (initialData) {
      // Convert imageUrl to HTTPS
      const sanitizedData = {
        ...initialData,
        imageUrl: toHttps(initialData.imageUrl),
      };
      setFormData(getInitialFormData(sanitizedData));

      // Check if we should auto-fetch missing data
      // If we have a productUrl but are missing name, price, or brand, fetch from server
      const hasMissingData = !initialData.name || !initialData.price || !initialData.brand;
      const hasProductUrl = initialData.productUrl && initialData.productUrl.startsWith('http');

      if (hasMissingData && hasProductUrl) {
        console.log('Auto-fetching missing product data from:', initialData.productUrl);
        setAutoFetching(true);

        const functions = getFunctions();
        const scrapeProductInfo = httpsCallable<{ url: string }, {
          name?: string;
          image?: string;
          description?: string;
          price?: number;
          currency?: string;
          brand?: string;
          error?: string;
        }>(functions, 'scrapeProductInfo');

        scrapeProductInfo({ url: initialData.productUrl! })
          .then((result) => {
            const data = result.data;
            if (!data.error) {
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
            }
          })
          .catch((err) => {
            console.error('Auto-fetch failed:', err);
          })
          .finally(() => {
            setAutoFetching(false);
          });
      }
    }
  }, [initialData, defaultCurrency]);

  const resetForm = () => {
    setFormData(getInitialFormData());
    setSelectedImage(null);
  };

  const handleClose = () => {
    resetForm();
    setIsOpen(false);
  };

  // Get all unique currencies from trip locations + budget currency
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    currencies.add(defaultCurrency); // Add budget currency
    tripLocations.forEach(loc => {
      if (loc.currency) {
        currencies.add(loc.currency);
      }
    });
    return Array.from(currencies).sort();
  }, [tripLocations, defaultCurrency]);

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

      // Reset form and close modal
      resetForm();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error adding item:', error);
      const errorMessage = error?.message || 'Failed to add item. Please try again.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Only show trigger button when not externally controlled */}
      {!isControlledExternally && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Shopping Item</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {autoFetching && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Nike, Amazon, Zara"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="flex gap-2 justify-center">
                  {PRIORITY_LEVELS.map((p) => (
                    <button
                      key={p.level}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.level })}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 ${
                        formData.priority === p.level
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      title={p.label}
                    >
                      <span className="text-2xl mb-1">{p.icon}</span>
                      <span className="text-xs text-gray-600">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              {formData.imageUrl && !selectedImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Image (from URL)
                  </label>
                  <div className="relative">
                    <img
                      src={toHttps(formData.imageUrl)}
                      alt="Product preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {!formData.imageUrl && (
                <ImageUpload
                  onImageSelected={setSelectedImage}
                />
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {uploading ? 'Uploading...' : loading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
