import { Plane, WifiOff } from 'lucide-react';
import type { Trip, CreateTripInput } from '../../types/Trip';
import { TripCard } from './TripCard';
import { TripCardSkeletonGrid } from './TripCardSkeleton';
import { CreateTrip } from './CreateTrip';
import { EmptyState } from '../Shared/EmptyState';
import { OnboardingTooltip } from '../Shared/OnboardingTooltip';

interface TripListProps {
  trips: Trip[];
  loading: boolean;
  /** The trips came only from the offline cache. */
  fromCache: boolean;
  onCreateTrip: (trip: CreateTripInput) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
  onEditTrip: (trip: Trip) => void;
  onShareTrip: (trip: Trip) => void;
  currentUserId: string;
}

export function TripList({ trips, loading, fromCache, onCreateTrip, onDeleteTrip, onEditTrip, onShareTrip, currentUserId }: TripListProps) {
  // The empty state has its own "New Trip" button: show one primary action, not two.
  const showsEmptyState = trips.length === 0 && !loading && !fromCache;

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-600 mt-1">Plan and manage your travel shopping</p>
        </div>
        {!showsEmptyState && <CreateTrip onCreateTrip={onCreateTrip} />}
      </div>

      {loading && trips.length === 0 ? (
        <TripCardSkeletonGrid count={3} />
      ) : trips.length === 0 && fromCache ? (
        // Nothing cached and no server: don't claim the user has no trips.
        <EmptyState
          icon={WifiOff}
          title="You're offline."
          description="Your trips will appear when you reconnect."
        />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No trips yet"
          description="Create your first trip to start building your shopping list"
        >
          <OnboardingTooltip
            tipId="first-trip"
            message="Start by creating your first trip! Add your destination, dates, and budget."
            position="bottom"
            showCondition={showsEmptyState}
          >
            <CreateTrip onCreateTrip={onCreateTrip} />
          </OnboardingTooltip>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
