import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { TripList } from '../components/Trip/TripList';
import { EditTrip } from '../components/Trip/EditTrip';
import { ShareTrip } from '../components/Trip/ShareTrip';
import type { Trip } from '../types/Trip';

export function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const { trips, loading, fromCache, createTrip, updateTrip, deleteTrip, removeCollaborator, leaveTrip } =
    useTrips(user?.uid || null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [sharingTripId, setSharingTripId] = useState<string | null>(null);

  // Look the trip up on every render so the share dialog shows live membership changes
  // (and closes if the trip goes away).
  const sharingTrip = sharingTripId ? trips.find((trip) => trip.id === sharingTripId) : undefined;

  return (
    <>
      <TripList
        trips={trips}
        loading={authLoading || loading}
        fromCache={fromCache}
        onCreateTrip={createTrip}
        onDeleteTrip={deleteTrip}
        onEditTrip={setEditingTrip}
        onShareTrip={(trip) => setSharingTripId(trip.id)}
        currentUserId={user?.uid || ''}
      />

      {editingTrip && (
        <EditTrip
          trip={editingTrip}
          isOpen={!!editingTrip}
          onClose={() => setEditingTrip(null)}
          onUpdateTrip={updateTrip}
        />
      )}

      {sharingTrip && (
        <ShareTrip
          trip={sharingTrip}
          isOpen
          onClose={() => setSharingTripId(null)}
          onRemoveCollaborator={removeCollaborator}
          onLeaveTrip={leaveTrip}
          currentUserId={user?.uid || ''}
          currentUserEmail={user?.email ?? null}
        />
      )}
    </>
  );
}
