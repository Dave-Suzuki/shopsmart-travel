import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  arrayRemove,
  type DocumentData,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../services/firebase';
import type { Trip, CreateTripInput, UpdateTripInput } from '../types/Trip';
import { SERVER_GRACE_MS, isAwaitingServer, toDate } from '../utils/firestore';

interface TripsSnapshot {
  userId: string;
  trips: Trip[];
  fromCache: boolean;
  /** False while cache-only data waits for the server (see SERVER_GRACE_MS). */
  settled: boolean;
  error: string | null;
}

const NO_TRIPS: Trip[] = [];

function toTrip(id: string, data: DocumentData): Trip {
  return {
    id,
    ...data,
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Trip;
}

export function useTrips(userId: string | null) {
  const [snapshot, setSnapshot] = useState<TripsSnapshot | null>(null);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'trips'),
      where('owners', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        clearTimeout(graceTimer);
        const trips = snap.docs.map((d) => toTrip(d.id, d.data({ serverTimestamps: 'estimate' })));
        const { fromCache } = snap.metadata;
        const awaitingServer = isAwaitingServer(fromCache);

        setSnapshot((prev) => ({
          userId,
          trips,
          fromCache,
          settled: (prev?.userId === userId && prev.settled) || !awaitingServer,
          error: null,
        }));

        if (awaitingServer) {
          graceTimer = setTimeout(() => {
            setSnapshot((prev) =>
              prev && prev.userId === userId && !prev.settled ? { ...prev, settled: true } : prev
            );
          }, SERVER_GRACE_MS);
        }
      },
      (err) => {
        clearTimeout(graceTimer);
        console.error('Error fetching trips:', err);
        setSnapshot((prev) => ({
          userId,
          trips: prev?.userId === userId ? prev.trips : NO_TRIPS,
          fromCache: prev?.userId === userId ? prev.fromCache : false,
          settled: true,
          error: 'Failed to load trips',
        }));
      }
    );

    return () => {
      clearTimeout(graceTimer);
      unsubscribe();
    };
  }, [userId]);

  // Only trust data that belongs to the current user.
  const current = userId && snapshot?.userId === userId ? snapshot : null;
  const trips = current?.trips ?? NO_TRIPS;
  const loading = !!userId && !current?.settled;
  const fromCache = current?.fromCache ?? false;
  const error = current?.error ?? null;

  const createTrip = async (tripData: CreateTripInput) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      await addDoc(collection(db, 'trips'), {
        ...tripData,
        owners: [userId],
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error creating trip:', err);
      throw new Error('Failed to create trip');
    }
  };

  const updateTrip = async (tripId: string, updates: UpdateTripInput) => {
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating trip:', err);
      throw new Error('Failed to update trip');
    }
  };

  /** Deletes a trip and its shopping list. Only the trip's creator may do this. */
  const deleteTrip = async (tripId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User must be authenticated');
      }

      // Delete all shopping list items first
      const itemsSnapshot = await getDocs(collection(db, `trips/${tripId}/shoppingList`));
      const deletePromises = itemsSnapshot.docs.map(async (itemDoc) => {
        const item = itemDoc.data();
        // Delete image if exists
        if (item.imageUrl) {
          try {
            const imageRef = ref(storage, `images/${userId}/${itemDoc.id}/original`);
            await deleteObject(imageRef);
          } catch (imgErr) {
            console.error('Error deleting image:', imgErr);
            // Continue even if image deletion fails
          }
        }
        // Delete item document
        await deleteDoc(itemDoc.ref);
      });

      await Promise.all(deletePromises);

      // Delete the trip
      await deleteDoc(doc(db, 'trips', tripId));
    } catch (err) {
      console.error('Error deleting trip:', err);
      throw new Error('Failed to delete trip');
    }
  };

  /** Removes someone from a trip. Only the trip's creator may do this. */
  const removeCollaborator = async (tripId: string, userIdToRemove: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) throw new Error('Trip not found');
    if (trip.createdBy !== userId) throw new Error('Only the trip creator can remove people');
    if (userIdToRemove === trip.createdBy) throw new Error('Cannot remove the trip creator');

    try {
      await updateDoc(doc(db, 'trips', tripId), {
        owners: arrayRemove(userIdToRemove),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error removing collaborator:', err);
      throw new Error('Failed to remove collaborator');
    }
  };

  /** Removes the current user from a trip they were invited to. */
  const leaveTrip = async (tripId: string) => {
    if (!userId) throw new Error('User not authenticated');
    const trip = trips.find((t) => t.id === tripId);
    if (trip?.createdBy === userId) {
      throw new Error("You created this trip, so you can't leave it. Delete it instead.");
    }

    try {
      await updateDoc(doc(db, 'trips', tripId), {
        owners: arrayRemove(userId),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error leaving trip:', err);
      throw new Error('Failed to leave trip');
    }
  };

  return {
    trips,
    loading,
    fromCache,
    error,
    createTrip,
    updateTrip,
    deleteTrip,
    removeCollaborator,
    leaveTrip,
  };
}
