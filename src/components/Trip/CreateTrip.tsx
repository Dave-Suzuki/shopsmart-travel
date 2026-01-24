import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { CreateTripInput } from '../../types/Trip';
import { CATEGORIES } from '../../constants/categories';

interface CreateTripProps {
  onCreateTrip: (trip: CreateTripInput) => Promise<void>;
}

export function CreateTrip({ onCreateTrip }: CreateTripProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTripInput>({
    name: '',
    destination: '',
    locations: [],
    categories: [...CATEGORIES], // Start with default categories
    startDate: new Date(),
    endDate: new Date(),
    budget: 0,
    budgetCurrency: 'USD',
  });
  const [newLocation, setNewLocation] = useState({ name: '', currency: 'USD' });
  const [newCategory, setNewCategory] = useState({ value: '', label: '', icon: '📦' });

  const addLocation = () => {
    if (newLocation.name.trim()) {
      setFormData({
        ...formData,
        locations: [...(formData.locations || []), { ...newLocation }],
      });
      setNewLocation({ name: '', currency: 'USD' });
    }
  };

  const removeLocation = (index: number) => {
    setFormData({
      ...formData,
      locations: formData.locations?.filter((_, i) => i !== index) || [],
    });
  };

  const addCategory = () => {
    if (newCategory.value.trim() && newCategory.label.trim()) {
      setFormData({
        ...formData,
        categories: [...(formData.categories || []), { ...newCategory }],
      });
      setNewCategory({ value: '', label: '', icon: '📦' });
    }
  };

  const removeCategory = (index: number) => {
    setFormData({
      ...formData,
      categories: formData.categories?.filter((_, i) => i !== index) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate dates
    if (formData.endDate < formData.startDate) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      await onCreateTrip(formData);
      setFormData({
        name: '',
        destination: '',
        locations: [],
        categories: [...CATEGORIES],
        startDate: new Date(),
        endDate: new Date(),
        budget: 0,
        budgetCurrency: 'USD',
      });
      setNewLocation({ name: '', currency: 'USD' });
      setNewCategory({ value: '', label: '', icon: '📦' });
      setIsOpen(false);
    } catch (error) {
      alert('Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
      >
        <Plus className="w-5 h-5" />
        New Trip
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create New Trip</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  maxLength={200}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 200) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paris & London Trip"
                />
              </div>

              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  id="destination"
                  required
                  maxLength={200}
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value.slice(0, 200) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paris, London"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locations (Shopping Cities)
                </label>

                {formData.locations && formData.locations.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formData.locations.map((loc, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                        <span className="flex-1 text-sm font-medium">{loc.name}</span>
                        <span className="text-xs text-gray-500">{loc.currency}</span>
                        <button
                          type="button"
                          onClick={() => removeLocation(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., Budapest"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  />
                  <select
                    value={newLocation.currency}
                    onChange={(e) => setNewLocation({ ...newLocation, currency: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="HUF">HUF</option>
                    <option value="JPY">JPY</option>
                  </select>
                  <button
                    type="button"
                    onClick={addLocation}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Add the cities where you'll be shopping</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shopping Categories
                </label>

                {formData.categories && formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.categories.map((cat, index) => (
                      <div key={index} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.label}</span>
                        <button
                          type="button"
                          onClick={() => removeCategory(index)}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory.label}
                    onChange={(e) => setNewCategory({ ...newCategory, value: e.target.value.toLowerCase().replace(/\s+/g, '-'), label: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., Baby Items"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  />
                  <input
                    type="text"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                    placeholder="👶"
                    maxLength={2}
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Customize your shopping categories</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formatDateForInput(formData.startDate)}
                    onChange={(e) => {
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      setFormData({ ...formData, startDate: new Date(year, month - 1, day) });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    required
                    value={formatDateForInput(formData.endDate)}
                    onChange={(e) => {
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      setFormData({ ...formData, endDate: new Date(year, month - 1, day) });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                    Budget
                  </label>
                  <input
                    type="number"
                    id="budget"
                    required
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFormData({ ...formData, budget: Math.max(0, value || 0) });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={formData.budgetCurrency}
                    onChange={(e) => setFormData({ ...formData, budgetCurrency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
