import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CreateTripInput } from '../../types/Trip';
import { TripForm } from './TripForm';
import { emptyTripFormValues, type TripFormValues } from './tripFormValues';

interface CreateTripProps {
  onCreateTrip: (trip: CreateTripInput) => Promise<void>;
}

export function CreateTrip({ onCreateTrip }: CreateTripProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Kept here, not in the dialog, so closing the dialog by accident doesn't lose the draft
  const [values, setValues] = useState<TripFormValues>(emptyTripFormValues);

  const handleSubmit = async (input: CreateTripInput) => {
    await onCreateTrip(input);
    setValues(emptyTripFormValues());
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-11 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
      >
        <Plus className="w-5 h-5" aria-hidden="true" />
        New Trip
      </button>

      {isOpen && (
        <TripForm
          title="Create New Trip"
          values={values}
          onValuesChange={setValues}
          onSubmit={handleSubmit}
          onClose={() => setIsOpen(false)}
          submitLabel="Create Trip"
          submittingLabel="Creating..."
          errorMessage="Failed to create trip"
        />
      )}
    </>
  );
}
