export interface TripLocation {
  name: string;
  currency?: string;
}

export interface TripCategory {
  value: string;
  label: string;
  icon: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  locations?: TripLocation[];
  categories?: TripCategory[];
  startDate: Date;
  endDate: Date;
  budget: number;
  budgetCurrency: string;
  owners: string[]; // Array of user IDs
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTripInput {
  name: string;
  destination: string;
  locations?: TripLocation[];
  categories?: TripCategory[];
  startDate: Date;
  endDate: Date;
  budget: number;
  budgetCurrency: string;
}

export interface UpdateTripInput {
  name?: string;
  destination?: string;
  locations?: TripLocation[];
  categories?: TripCategory[];
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  budgetCurrency?: string;
}
