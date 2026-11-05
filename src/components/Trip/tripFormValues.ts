import type { CreateTripInput, Trip } from '../../types/Trip';
import { DEFAULT_CATEGORIES } from '../../constants/categories';
import { fromDateInput, toDateInput, todayInput } from '../../utils/dates';

/** The trip form's fields. Dates are the inputs' "YYYY-MM-DD" values, converted on submit. */
export type TripFormValues = Omit<CreateTripInput, 'startDate' | 'endDate'> & {
  startDate: string;
  endDate: string;
};

/** A blank form for a new trip: today to today, no budget, the default categories. */
export function emptyTripFormValues(): TripFormValues {
  return {
    name: '',
    destination: '',
    locations: [],
    categories: [...DEFAULT_CATEGORIES], // Start with default categories
    startDate: todayInput(),
    endDate: todayInput(),
    budget: 0,
    budgetCurrency: 'USD',
  };
}

/** The form pre-filled from an existing trip (its dates as local calendar days). */
export function tripFormValuesFromTrip(trip: Trip): TripFormValues {
  return {
    name: trip.name,
    destination: trip.destination,
    locations: trip.locations || [],
    categories: trip.categories || [...DEFAULT_CATEGORIES],
    startDate: toDateInput(trip.startDate),
    endDate: toDateInput(trip.endDate),
    budget: trip.budget,
    budgetCurrency: trip.budgetCurrency,
  };
}

/** Converts the form's values for saving, or returns the message to show if the dates are invalid. */
export function toTripInput(values: TripFormValues): { input: CreateTripInput } | { error: string } {
  const startDate = fromDateInput(values.startDate);
  const endDate = fromDateInput(values.endDate);
  if (!startDate || !endDate) return { error: 'Please enter a start and end date' };
  if (endDate < startDate) return { error: 'End date must be after start date' };
  return { input: { ...values, startDate, endDate } };
}
