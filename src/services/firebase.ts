import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with explicit dependencies.
// Using initializeAuth instead of getAuth avoids the automatic getRedirectResult()
// call that causes "missing initial state" errors on storage-partitioned browsers
// (iOS Safari, Chrome with third-party cookie restrictions).
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
// Keep Firestore data in IndexedDB (shared by all open tabs) so trips and lists load offline
// and after a reload. Falls back to an in-memory cache where IndexedDB isn't available.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Add custom parameters for better mobile compatibility
googleProvider.setCustomParameters({
  // Force account selection to avoid cached credentials issues
  prompt: 'select_account'
  // Note: Removed 'display: popup' as it conflicts with mobile redirect flow
});

export default app;
