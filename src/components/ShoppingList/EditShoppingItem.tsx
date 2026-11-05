import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { ShoppingListItem, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation, TripCategory } from '../../types/Trip';
import { CATEGORIES } from '../../constants/categories';
import { PRIORITY_LEVELS } from '../../constants/priorities';
import { ImageUpload } from '../Shared/ImageUpload';
import { useImageUpload } from '../../hooks/useImageUpload';
import { showError } from '../../utils/toast';
import { fromDateInput, toDateInput } from '../../utils/dates';
import { toStorableLinkUrl } from '../../utils/url';

interface EditShoppingItemProps {
  item: ShoppingListItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (itemId: string, updates: UpdateShoppingListItemInput) => Promise<void>;
  tripLocations?: TripLocation[];
  budgetCurrency: string;
  tripCategories?: TripCategory[];
}

export function EditShoppingItem({ item, isOpen, onClose, onUpdateItem, tripLocations = [], budgetCurrency, tripCategories = CATEGORIES as unknown as TripCategory[] }: EditShoppingItemProps) {
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const { uploadImage, deleteImage, uploading } = useImageUpload();
  const [formData, setFormData] = useState({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    currency: item.currency,
    category: item.category || '',
    priority: item.priority || 3,
    purchaseLocation: item.purchaseLocation || '',
    brand: item.brand || '',
    notes: item.notes || '',
    description: item.description || '',
    productUrl: item.productUrl || '',
    purchased: item.purchased,
    // Purchase details
    purchasePrice: item.purchasePrice,
    purchaseCurrency: item.purchaseCurrency || budgetCurrency,
    purchaseDate: item.purchaseDate ? toDateInput(item.purchaseDate) : '',
    actualPurchaseLocation: item.actualPurchaseLocation || '',
  });

  // Get all unique currencies from trip locations + budget currency
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    currencies.add(budgetCurrency); // Add budget currency
    tripLocations.forEach(loc => {
      if (loc.currency) {
        currencies.add(loc.currency);
      }
    });
    return Array.from(currencies).sort();
  }, [tripLocations, budgetCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Links are never saved as empty strings: unchanged -> leave alone, cleared -> remove (null)
    const { productUrl: productUrlInput, purchaseDate: purchaseDateInput, ...fields } = formData;
    const productUrl = productUrlInput.trim();
    const productUrlUpdate =
      productUrl === (item.productUrl ?? '') ? undefined : productUrl || (item.productUrl ? null : undefined);
    if (productUrlUpdate && !toStorableLinkUrl(productUrlUpdate)) {
      showError('Product links must start with http:// or https://');
      return;
    }

    setLoading(true);

    try {
      // undefined = keep the current image, null = remove it, string = the new upload
      let imageUrl: string | null | undefined;

      if (selectedImage) {
        // Delete old image if exists
        if (item.imageUrl) {
          await deleteImage(item.id);
        }
        imageUrl = await uploadImage(selectedImage, item.id);
      } else if (shouldRemoveImage && item.imageUrl) {
        imageUrl = null;
      }

      const updates: UpdateShoppingListItemInput = {
        ...fields,
        // Ensure quantity is an integer (Firestore rules require `quantity is int`)
        quantity: Math.max(1, Math.floor(Number(fields.quantity) || 1)),
        imageUrl,
        productUrl: productUrlUpdate,
        // Convert the purchase date (a local calendar day) if provided
        purchaseDate: (purchaseDateInput && fromDateInput(purchaseDateInput)) || undefined,
      };

      await onUpdateItem(item.id, updates);

      if (imageUrl === null) {
        // The item no longer points at the photo, so delete the file (best effort).
        deleteImage(item.id).catch((err) => console.error('Error deleting image:', err));
      }

      onClose();
    } catch {
      showError('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleImageRemoved = () => {
    setShouldRemoveImage(true);
    setSelectedImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Item</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              id="edit-name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Sunscreen"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                id="edit-quantity"
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
              <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                id="edit-price"
                required
                min="0"
                step="0.01"
                value={formData.price}
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
              <label htmlFor="edit-currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                id="edit-currency"
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
              <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="edit-category"
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
            <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Location
            </label>
            <select
              id="edit-location"
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
            <label htmlFor="edit-brand" className="block text-sm font-medium text-gray-700 mb-1">
              Brand / Store
            </label>
            <input
              type="text"
              id="edit-brand"
              value={formData.brand}
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
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Product description"
              />
            </div>
          )}

          {formData.productUrl && (
            <div>
              <label htmlFor="edit-product-url" className="block text-sm font-medium text-gray-700 mb-1">
                Product URL
              </label>
              <input
                type="url"
                id="edit-product-url"
                value={formData.productUrl}
                onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/product"
              />
            </div>
          )}

          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          <ImageUpload
            currentImageUrl={shouldRemoveImage ? undefined : item.imageUrl}
            onImageSelected={setSelectedImage}
            onImageRemoved={handleImageRemoved}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-purchased"
              checked={formData.purchased}
              onChange={(e) => setFormData({ ...formData, purchased: e.target.checked })}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="edit-purchased" className="text-sm font-medium text-gray-700">
              Mark as purchased
            </label>
          </div>

          {/* Purchase Details - only show if item is purchased */}
          {formData.purchased && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
              <h3 className="font-medium text-gray-900 text-sm">Purchase Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-purchase-price" className="block text-sm font-medium text-gray-700 mb-1">
                    Actual Price
                  </label>
                  <input
                    type="number"
                    id="edit-purchase-price"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice ?? ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      const validPrice = isNaN(value) || value < 0 ? 0 : value;
                      setFormData({ ...formData, purchasePrice: validPrice });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="edit-purchase-currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    id="edit-purchase-currency"
                    value={formData.purchaseCurrency}
                    onChange={(e) => setFormData({ ...formData, purchaseCurrency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {availableCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-purchase-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  id="edit-purchase-date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="edit-actual-location" className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Purchase Location
                </label>
                <select
                  id="edit-actual-location"
                  value={formData.actualPurchaseLocation}
                  onChange={(e) => setFormData({ ...formData, actualPurchaseLocation: e.target.value })}
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
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
