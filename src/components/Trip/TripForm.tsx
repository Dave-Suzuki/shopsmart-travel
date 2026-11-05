import { useId, useState, type Dispatch, type SetStateAction } from 'react';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { CreateTripInput } from '../../types/Trip';
import { showError } from '../../utils/toast';
import { Modal } from '../Shared/Modal';
import { toTripInput, type TripFormValues } from './tripFormValues';

const LOCATION_CURRENCIES = ['USD', 'EUR', 'GBP', 'HUF', 'JPY'];
const BUDGET_CURRENCIES = ['USD', 'EUR', 'GBP'];

const INPUT_CLASS =
  'w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
// 16px text on phones: iOS zooms into anything smaller when it's focused
const SMALL_INPUT_CLASS =
  'min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm';
const ADD_BUTTON_CLASS =
  'flex h-11 w-11 shrink-0 items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200';

const emptyLocation = () => ({ name: '', currency: 'USD' });
const emptyCategory = () => ({ value: '', label: '', icon: '📦' });

interface TripFormProps {
  title: string;
  /** The form's values; the caller owns them (so a cancelled new trip keeps its draft). */
  values: TripFormValues;
  onValuesChange: Dispatch<SetStateAction<TripFormValues>>;
  /** Saves the trip. The caller closes the form when this resolves. */
  onSubmit: (input: CreateTripInput) => Promise<void>;
  onClose: () => void;
  submitLabel: string;
  submittingLabel: string;
  /** Shown when onSubmit fails. */
  errorMessage: string;
}

/** The trip dialog shared by "New Trip" and "Edit Trip". */
export function TripForm({
  title,
  values,
  onValuesChange: setValues,
  onSubmit,
  onClose,
  submitLabel,
  submittingLabel,
  errorMessage,
}: TripFormProps) {
  const id = useId();
  const [loading, setLoading] = useState(false);
  const [newLocation, setNewLocation] = useState(emptyLocation);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [showCategories, setShowCategories] = useState(false);

  const locations = values.locations || [];
  const categories = values.categories || [];
  // Keep a trip's existing currency selectable even if it isn't one we offer by default
  const budgetCurrencies = BUDGET_CURRENCIES.includes(values.budgetCurrency)
    ? BUDGET_CURRENCIES
    : [...BUDGET_CURRENCIES, values.budgetCurrency];

  const addLocation = () => {
    if (newLocation.name.trim()) {
      setValues((prev) => ({ ...prev, locations: [...(prev.locations || []), { ...newLocation }] }));
      setNewLocation(emptyLocation());
    }
  };

  const removeLocation = (index: number) => {
    setValues((prev) => ({ ...prev, locations: prev.locations?.filter((_, i) => i !== index) || [] }));
  };

  const addCategory = () => {
    if (newCategory.value.trim() && newCategory.label.trim()) {
      setValues((prev) => ({ ...prev, categories: [...(prev.categories || []), { ...newCategory }] }));
      setNewCategory(emptyCategory());
    }
  };

  const removeCategory = (index: number) => {
    setValues((prev) => ({ ...prev, categories: prev.categories?.filter((_, i) => i !== index) || [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = toTripInput(values);
    if ('error' in result) {
      showError(result.error);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(result.input);
    } catch {
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formId = `${id}-form`;
  const categoriesId = `${id}-categories`;

  return (
    <Modal
      title={title}
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
            disabled={loading}
            className="flex-1 min-h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? submittingLabel : submitLabel}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={`${id}-name`} className="block text-sm font-medium text-gray-700 mb-1">
            Trip Name
          </label>
          <input
            type="text"
            id={`${id}-name`}
            required
            maxLength={200}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value.slice(0, 200) })}
            className={INPUT_CLASS}
            placeholder="Paris & London Trip"
          />
        </div>

        <div>
          <label htmlFor={`${id}-destination`} className="block text-sm font-medium text-gray-700 mb-1">
            Destination
          </label>
          <input
            type="text"
            id={`${id}-destination`}
            required
            maxLength={200}
            value={values.destination}
            onChange={(e) => setValues({ ...values, destination: e.target.value.slice(0, 200) })}
            className={INPUT_CLASS}
            placeholder="Paris, London"
          />
        </div>

        {/* min-w-0: a fieldset is at least as wide as its content by default */}
        <fieldset className="min-w-0">
          <legend className="block text-sm font-medium text-gray-700 mb-1">
            Locations (Shopping Cities)
          </legend>

          {locations.length > 0 && (
            <ul className="space-y-2 mb-3">
              {locations.map((loc, index) => (
                <li key={index} className="flex items-center gap-2 bg-gray-50 pl-3 rounded-lg">
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{loc.name}</span>
                  <span className="text-xs text-gray-500">{loc.currency}</span>
                  <button
                    type="button"
                    onClick={() => removeLocation(index)}
                    aria-label={`Remove ${loc.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* min-w-0 lets the text field shrink, so the row fits a 343px-wide phone form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              aria-label="City name"
              className={`${SMALL_INPUT_CLASS} min-w-0 flex-1`}
              placeholder="e.g., Budapest"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
            />
            <select
              value={newLocation.currency}
              onChange={(e) => setNewLocation({ ...newLocation, currency: e.target.value })}
              aria-label="City currency"
              className={`${SMALL_INPUT_CLASS} w-24 shrink-0`}
            >
              {LOCATION_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <button type="button" onClick={addLocation} aria-label="Add city" className={ADD_BUTTON_CLASS}>
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Add the cities where you'll be shopping</p>
        </fieldset>

        <div>
          <button
            type="button"
            onClick={() => setShowCategories((open) => !open)}
            aria-expanded={showCategories}
            aria-controls={categoriesId}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>
              Customize categories <span className="font-normal text-gray-500">({categories.length})</span>
            </span>
            <ChevronDown
              className={`h-5 w-5 text-gray-500 motion-safe:transition-transform ${showCategories ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {showCategories && (
            <div id={categoriesId} className="mt-3">
              {categories.length > 0 && (
                <ul className="flex flex-wrap gap-2 mb-3" aria-label="Shopping categories">
                  {categories.map((cat, index) => (
                    <li key={index} className="flex items-center bg-gray-50 pl-3 rounded-lg border border-gray-200">
                      <span className="text-sm" aria-hidden="true">{cat.icon}</span>
                      <span className="ml-1 text-sm font-medium">{cat.label}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        aria-label={`Remove ${cat.label}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-red-500 hover:text-red-700"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory.label}
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      value: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      label: e.target.value,
                    })
                  }
                  aria-label="New category name"
                  className={`${SMALL_INPUT_CLASS} min-w-0 flex-1`}
                  placeholder="e.g., Baby Items"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                />
                <input
                  type="text"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  aria-label="New category icon"
                  className={`${SMALL_INPUT_CLASS} w-16 shrink-0 text-center`}
                  placeholder="👶"
                  maxLength={2}
                />
                <button type="button" onClick={addCategory} aria-label="Add category" className={ADD_BUTTON_CLASS}>
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Customize your shopping categories</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${id}-start`} className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id={`${id}-start`}
              required
              value={values.startDate}
              onChange={(e) => setValues({ ...values, startDate: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor={`${id}-end`} className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id={`${id}-end`}
              required
              value={values.endDate}
              onChange={(e) => setValues({ ...values, endDate: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${id}-budget`} className="block text-sm font-medium text-gray-700 mb-1">
              Budget
            </label>
            <input
              type="number"
              id={`${id}-budget`}
              required
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.budget}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setValues({ ...values, budget: Math.max(0, value || 0) });
              }}
              className={INPUT_CLASS}
              placeholder="5000"
            />
          </div>

          <div>
            <label htmlFor={`${id}-currency`} className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id={`${id}-currency`}
              value={values.budgetCurrency}
              onChange={(e) => setValues({ ...values, budgetCurrency: e.target.value })}
              className={INPUT_CLASS}
            >
              {budgetCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
