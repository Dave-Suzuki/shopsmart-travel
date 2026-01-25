import { Plane } from 'lucide-react';
import type { Trip, CreateTripInput } from '../../types/Trip';
import { TripCard } from './TripCard';
import { TripCardSkeletonGrid } from './TripCardSkeleton';
import { CreateTrip } from './CreateTrip';
import { EmptyState } from '../Shared/EmptyState';
import { OnboardingTooltip } from '../Shared/OnboardingTooltip';

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
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Trips</h2>
          <p className="text-gray-600 mt-1">Plan and manage your travel shopping</p>
        </div>
        <OnboardingTooltip
          tipId="first-trip"
          message="Start by creating your first trip! Add your destination, dates, and budget."
          position="left"
          showCondition={trips.length === 0 && !loading}
        >
          <CreateTrip onCreateTrip={onCreateTrip} />
        </OnboardingTooltip>
      </div>

      {loading ? (
        <TripCardSkeletonGrid count={3} />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No trips yet"
          description="Create your first trip to start building your shopping list"
        >
          <CreateTrip onCreateTrip={onCreateTrip} />
        </EmptyState>
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
