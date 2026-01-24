import { Plane } from 'lucide-react';
import type { Trip, CreateTripInput } from '../../types/Trip';
import { TripCard } from './TripCard';
import { CreateTrip } from './CreateTrip';

interface TripListProps {
  trips: Trip[];
  loading: boolean;
  onCreateTrip: (trip: CreateTripInput) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
  onEditTrip: (trip: Trip) => void;
  onShareTrip: (trip: Trip) => void;
  currentUserId: string;
}

export function TripList({ trips, loading, onCreateTrip, onDeleteTrip, onEditTrip, onShareTrip, currentUserId }: TripListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading trips...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Trips</h2>
          <p className="text-gray-600 mt-1">Plan and manage your travel shopping</p>
        </div>
        <CreateTrip onCreateTrip={onCreateTrip} />
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Plane className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first trip to start building your shopping list
          </p>
          <CreateTrip onCreateTrip={onCreateTrip} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={onDeleteTrip}
              onEdit={onEditTrip}
              onShare={onShareTrip}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
