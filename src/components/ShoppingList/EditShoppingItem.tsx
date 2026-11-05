import { useState, useMemo, useId } from 'react';
import { ExternalLink } from 'lucide-react';
import type { ShoppingListItem, UpdateShoppingListItemInput } from '../../types/ShoppingList';
import type { TripLocation, TripCategory } from '../../types/Trip';
import { DEFAULT_CATEGORIES } from '../../constants/categories';
import { ImageUpload } from '../Shared/ImageUpload';
import { Modal } from '../Shared/Modal';
import { PriorityPicker } from './PriorityPicker';
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

const INPUT_CLASS =
  'w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export function EditShoppingItem({ isOpen, ...props }: EditShoppingItemProps) {
  // Mount the form only while open, so each opening starts from the item's current values.
  if (!isOpen) return null;
  return <EditItemForm {...props} />;
}

function EditItemForm({ item, onClose, onUpdateItem, tripLocations = [], budgetCurrency, tripCategories = DEFAULT_CATEGORIES }: Omit<EditShoppingItemProps, 'isOpen'>) {
  const formId = useId();
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

  // Currencies from the trip's locations, the budget and the item itself (so the item's
  // currency is always one of the options)
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    currencies.add(budgetCurrency); // Add budget currency
    currencies.add(item.currency);
    if (item.purchaseCurrency) currencies.add(item.purchaseCurrency);
    tripLocations.forEach(loc => {
      if (loc.currency) {
        currencies.add(loc.currency);
      }
    });
    return Array.from(currencies).sort();
  }, [tripLocations, budgetCurrency, item.currency, item.purchaseCurrency]);

  // The saved product page (the link left the list row, so it lives here)
  const productPage = toStorableLinkUrl(item.productUrl);

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

  return (
    <Modal
      title="Edit Item"
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
            {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {productPage && (
          <a
            href={productPage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 font-medium text-purple-700 hover:bg-purple-100 transition-colors duration-200"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Open product page
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}

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
            className={INPUT_CLASS}
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
              className={INPUT_CLASS}
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
              inputMode="decimal"
              value={formData.price}
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
            <label htmlFor="edit-currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="edit-currency"
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
            <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="edit-category"
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
          <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Location
          </label>
          <select
            id="edit-location"
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
          <label htmlFor="edit-brand" className="block text-sm font-medium text-gray-700 mb-1">
            Brand / Store
          </label>
          <input
            type="text"
            id="edit-brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className={INPUT_CLASS}
            placeholder="e.g., Nike, Amazon, Zara"
          />
        </div>

        <PriorityPicker
          value={formData.priority}
          onChange={(priority) => setFormData({ ...formData, priority })}
        />

        <div>
          <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="edit-description"
            maxLength={500}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 500) })}
            className={INPUT_CLASS}
            rows={3}
            placeholder="Product description"
          />
        </div>

        <div>
          <label htmlFor="edit-product-url" className="block text-sm font-medium text-gray-700 mb-1">
            Product URL
          </label>
          <input
            type="url"
            id="edit-product-url"
            inputMode="url"
            value={formData.productUrl}
            onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
            className={INPUT_CLASS}
            placeholder="https://example.com/product"
          />
        </div>

        <div>
          <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="edit-notes"
            maxLength={5000}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, 5000) })}
            className={INPUT_CLASS}
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        <ImageUpload
          currentImageUrl={shouldRemoveImage ? undefined : item.imageUrl}
          onImageSelected={setSelectedImage}
          onImageRemoved={handleImageRemoved}
        />

        <label htmlFor="edit-purchased" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            id="edit-purchased"
            checked={formData.purchased}
            onChange={(e) => setFormData({ ...formData, purchased: e.target.checked })}
            className="h-6 w-6 cursor-pointer accent-green-600"
          />
          Mark as purchased
        </label>

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
                  inputMode="decimal"
                  value={formData.purchasePrice ?? ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    const validPrice = isNaN(value) || value < 0 ? 0 : value;
                    setFormData({ ...formData, purchasePrice: validPrice });
                  }}
                  className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
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
                className={INPUT_CLASS}
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
          </div>
        )}
      </form>
    </Modal>
  );
}
