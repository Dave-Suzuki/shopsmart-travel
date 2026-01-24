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
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../services/firebase';
import type { Trip, CreateTripInput, UpdateTripInput } from '../types/Trip';

export function useTrips(userId: string | null) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'trips'),
      where('owners', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tripsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startDate: (data.startDate as Timestamp).toDate(),
            endDate: (data.endDate as Timestamp).toDate(),
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate(),
          } as Trip;
        });
        setTrips(tripsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching trips:', err);
        setError('Failed to load trips');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

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

  const shareTrip = async (tripId: string, userIdToAdd: string) => {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const trip = trips.find((t) => t.id === tripId);

      if (!trip) {
        throw new Error('Trip not found');
      }

      // Check for duplicate
      if (trip.owners.includes(userIdToAdd)) {
        throw new Error('User is already a collaborator');
      }

      const updatedOwners = [...trip.owners, userIdToAdd];

      await updateDoc(tripRef, {
        owners: updatedOwners,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error sharing trip:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to share trip');
    }
  };

  const removeCollaborator = async (tripId: string, userIdToRemove: string) => {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const trip = trips.find((t) => t.id === tripId);

      if (!trip) {
        throw new Error('Trip not found');
      }

      if (trip.createdBy === userIdToRemove) {
        throw new Error('Cannot remove the trip creator');
      }

      const updatedOwners = trip.owners.filter((ownerId) => ownerId !== userIdToRemove);

      if (updatedOwners.length === 0) {
        throw new Error('Cannot remove all collaborators');
      }

      await updateDoc(tripRef, {
        owners: updatedOwners,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error removing collaborator:', err);
      throw new Error('Failed to remove collaborator');
    }
  };

  return {
    trips,
    loading,
    error,
    createTrip,
    updateTrip,
    deleteTrip,
    shareTrip,
    removeCollaborator,
  };
}
