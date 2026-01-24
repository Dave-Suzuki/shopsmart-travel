import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { useExtensionSync } from '../hooks/useExtensionSync';
import { TripList } from '../components/Trip/TripList';
import { EditTrip } from '../components/Trip/EditTrip';
import { ShareTrip } from '../components/Trip/ShareTrip';
import type { Trip } from '../types/Trip';

export function TripsPage() {
  const { user } = useAuth();
  const { trips, loading, createTrip, updateTrip, deleteTrip, shareTrip, removeCollaborator } = useTrips(user?.uid || null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [sharingTrip, setSharingTrip] = useState<Trip | null>(null);

  // Sync trips to Chrome extension
  const { syncStatus } = useExtensionSync(trips);

  return (
    <>
      {/* Extension sync success banner */}
      {syncStatus === 'synced' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-green-800">Trips synced to extension!</p>
            <p className="text-sm text-green-600">You can now close this tab and use the extension.</p>
          </div>
        </div>
      )}

      <TripList
        trips={trips}
        loading={loading}
        onCreateTrip={createTrip}
        onDeleteTrip={deleteTrip}
        onEditTrip={setEditingTrip}
        onShareTrip={setSharingTrip}
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
          isOpen={!!sharingTrip}
          onClose={() => setSharingTrip(null)}
          onShareTrip={shareTrip}
          onRemoveCollaborator={removeCollaborator}
          currentUserId={user?.uid || ''}
        />
      )}
    </>
  );
}
