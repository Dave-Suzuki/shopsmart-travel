import { useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { User } from 'firebase/auth';

export function useUserProfile(user: User | null) {
  useEffect(() => {
    if (!user || !user.email) return;

    const syncUserProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Error syncing user profile:', error);
      }
    };

    syncUserProfile();
  }, [user]);
}
