import { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { clearRedirectState, getRedirectState } from '../utils/authStorage';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);

  // Use ref to track processing state without causing re-renders
  const isProcessingRedirectRef = useRef(false);

  useEffect(() => {
    console.log('[AUTH:EFFECT] useEffect running');
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('[AUTH:INIT] Starting initAuth function');

        // Check for pending redirect state
        const redirectState = getRedirectState();
        const hasPendingRedirect = redirectState?.pendingRedirect;
        const redirectAge = redirectState?.redirectTimestamp
          ? Date.now() - redirectState.redirectTimestamp
          : Infinity;
        const isStaleRedirect = redirectAge > 5 * 60 * 1000; // 5 minutes

        console.log('[AUTH:INIT] Redirect state:', { hasPendingRedirect, redirectAge, isStaleRedirect });

        // Only clear truly stale redirects (older than 5 minutes)
        if (hasPendingRedirect && isStaleRedirect) {
          console.log('[AUTH:CLEANUP] Clearing stale redirect state (older than 5 minutes)');
          clearRedirectState();
        }

        // Set persistence with fallback chain for iOS Safari compatibility
        try {
          await setPersistence(auth, indexedDBLocalPersistence);
          console.log('[AUTH:INIT] Persistence set to IndexedDB');
        } catch (indexedDBError) {
          console.warn('[AUTH:INIT] IndexedDB failed, using localStorage');
          await setPersistence(auth, browserLocalPersistence);
        }

        // Process redirect result if we have a pending (non-stale) redirect
        if (hasPendingRedirect && !isStaleRedirect) {
          console.log('[AUTH:REDIRECT] Processing pending redirect result...');
          setIsProcessingRedirect(true);
          isProcessingRedirectRef.current = true;
        }

        const result = await getRedirectResult(auth);
        if (result) {
          console.log('[AUTH:SUCCESS] Redirect result found:', result.user.email);
        } else {
          console.log('[AUTH:INIT] No redirect result (normal page load or redirect failed)');
        }

        // Clear redirect state after processing (whether successful or not)
        if (hasPendingRedirect && !isStaleRedirect) {
          clearRedirectState();
          setIsProcessingRedirect(false);
          isProcessingRedirectRef.current = false;
        }

        console.log('[AUTH:INIT] Initialization complete');
      } catch (error: any) {
        console.error('[AUTH:ERROR] Init error:', error);
        if (!mounted) return;
        clearRedirectState();
        setIsProcessingRedirect(false);
        isProcessingRedirectRef.current = false;
      }
    };

    initAuth();

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;
      console.log('[AUTH:STATE] Auth state changed:', user ? user.email : 'signed out', 'isProcessingRedirect:', isProcessingRedirectRef.current);

      if (user) {
        // User authenticated - always update
        setUser(user);
        setLoading(false);
        setIsProcessingRedirect(false);
        isProcessingRedirectRef.current = false;
      } else if (!isProcessingRedirectRef.current) {
        // No user AND not processing redirect - safe to show login
        setUser(null);
        setLoading(false);
      } else {
        // No user BUT still processing redirect - keep loading state
        console.log('[AUTH:STATE] Holding loading state while processing redirect');
      }
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
      clearRedirectState();
      setIsProcessingRedirect(false);
      isProcessingRedirectRef.current = false;

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
    console.log('[AUTH:RETRY] Clearing error state and resetting for retry');
    clearRedirectState();
    setError(null);
    setIsProcessingRedirect(false);
    isProcessingRedirectRef.current = false;
  };

  return {
    user,
    loading,
    error,
    isProcessingRedirect,
    signInWithGoogle,
    signOut,
    retrySignIn,
  };
}
