import { useState } from 'react';
import type { CreateTripInput, Trip, UpdateTripInput } from '../../types/Trip';
import { TripForm } from './TripForm';
import { tripFormValuesFromTrip, type TripFormValues } from './tripFormValues';

interface EditTripProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip: (tripId: string, updates: UpdateTripInput) => Promise<void>;
}

export function EditTrip({ isOpen, ...props }: EditTripProps) {
  // Mount the form only while open, so each opening starts from the trip's current values.
  if (!isOpen) return null;
  return <EditTripForm {...props} />;
}

function EditTripForm({ trip, onClose, onUpdateTrip }: Omit<EditTripProps, 'isOpen'>) {
  const [values, setValues] = useState<TripFormValues>(() => tripFormValuesFromTrip(trip));

  const handleSubmit = async (input: CreateTripInput) => {
    await onUpdateTrip(trip.id, input);
    onClose();
  };

  return (
    <TripForm
      title="Edit Trip"
      values={values}
      onValuesChange={setValues}
      onSubmit={handleSubmit}
      onClose={onClose}
      submitLabel="Save Changes"
      submittingLabel="Saving..."
      errorMessage="Failed to update trip"
    />
  );
}
