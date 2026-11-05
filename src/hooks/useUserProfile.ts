import { useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { User } from 'firebase/auth';

// Firestore rules limit public profile fields to these lengths.
const MAX_DISPLAY_NAME = 200;
const MAX_PHOTO_URL = 2000;

/**
 * Keeps the signed-in user's records up to date:
 * - users/{uid}: private (only the user can read it); the invite function looks people up by
 *   emailLower. The rules require uid and email to match the user's own sign-in.
 * - profiles/{uid}: the public card (name, photo) that collaborators see.
 */
export function useUserProfile(user: User | null) {
  useEffect(() => {
    if (!user) return;

    const displayName = (user.displayName || '').slice(0, MAX_DISPLAY_NAME);
    const photoURL = user.photoURL && user.photoURL.length <= MAX_PHOTO_URL ? user.photoURL : '';

    const writes: Promise<void>[] = [
      setDoc(
        doc(db, 'profiles', user.uid),
        { displayName, photoURL, updatedAt: serverTimestamp() },
        { merge: true }
      ),
    ];

    if (user.email) {
      writes.push(
        setDoc(
          doc(db, 'users', user.uid),
          {
            uid: user.uid,
            email: user.email,
            emailLower: user.email.toLowerCase(),
            displayName,
            photoURL,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      );
    }

    // Each write stands alone, so one failing doesn't block the other.
    Promise.allSettled(writes).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') console.error('Error syncing user profile:', result.reason);
      }
    });
  }, [user]);
}
