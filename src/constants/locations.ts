export const LOCATIONS = [
  { id: 'paris', label: 'Paris', country: 'France', flag: '🇫🇷', currency: 'EUR' },
  { id: 'london', label: 'London', country: 'UK', flag: '🇬🇧', currency: 'GBP' },
  { id: 'online', label: 'Online', country: null, flag: '🌐', currency: 'USD' },
] as const;

export type LocationId = typeof LOCATIONS[number]['id'];
export type Currency = 'EUR' | 'GBP' | 'USD';
