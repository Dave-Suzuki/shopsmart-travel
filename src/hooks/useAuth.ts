import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Persistence is configured in firebase.ts via initializeAuth.
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);

      // Always use popup flow - redirect is broken due to third-party cookie restrictions
      console.log('[AUTH:POPUP] Using popup flow for sign-in');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AUTH:SUCCESS] Popup sign-in successful:', result.user.email);
    } catch (error: any) {
      console.error('[AUTH:ERROR] Error signing in with Google:', error);

      // Provide more helpful error messages for common issues
      if (error.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups for this site or try again.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please contact support.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User opened another popup, ignore
        return;
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Please contact support.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(error.message || 'Failed to sign in. Please try again.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const retrySignIn = () => {
    setError(null);
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
    retrySignIn,
  };
}
