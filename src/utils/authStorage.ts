/**
 * Multi-layer storage utility for auth redirect state
 * Uses both localStorage and sessionStorage to survive iOS Safari's aggressive clearing
 */

export interface RedirectState {
  pendingRedirect: boolean;
  redirectTimestamp: number;
  redirectAttempts: number;
}

const STORAGE_KEY = 'authRedirect';
const MAX_REDIRECT_AGE = 5 * 60 * 1000; // 5 minutes

/**
 * Safely access storage with fallback
 */
function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch (error) {
    console.warn(`[AUTH:STORAGE] Failed to read from storage:`, error);
    return null;
  }
}

/**
 * Safely set storage with fallback
 */
function safeSetItem(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[AUTH:STORAGE] Failed to write to storage:`, error);
    return false;
  }
}

/**
 * Safely remove from storage with fallback
 */
function safeRemoveItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn(`[AUTH:STORAGE] Failed to remove from storage:`, error);
  }
}

/**
 * Set redirect pending state in BOTH localStorage AND sessionStorage
 * This ensures state survives iOS Safari's aggressive clearing
 */
export function setRedirectPending(timestamp: number = Date.now()): void {
  const state: RedirectState = {
    pendingRedirect: true,
    redirectTimestamp: timestamp,
    redirectAttempts: 0,
  };

  const stateString = JSON.stringify(state);

  // Write to BOTH storage layers
  const localSuccess = safeSetItem(localStorage, STORAGE_KEY, stateString);
  const sessionSuccess = safeSetItem(sessionStorage, STORAGE_KEY, stateString);

  console.log('[AUTH:STORAGE] Set redirect pending:', {
    timestamp,
    localStorage: localSuccess,
    sessionStorage: sessionSuccess,
  });
}

/**
 * Get redirect state from storage
 * Tries localStorage FIRST (more reliable on iOS), falls back to sessionStorage
 */
export function getRedirectState(): RedirectState | null {
  // Try localStorage first (survives iOS Safari clearing)
  let stateString = safeGetItem(localStorage, STORAGE_KEY);
  let source = 'localStorage';

  // Fallback to sessionStorage
  if (!stateString) {
    stateString = safeGetItem(sessionStorage, STORAGE_KEY);
    source = 'sessionStorage';
  }

  if (!stateString) {
    console.log('[AUTH:STORAGE] No redirect state found');
    return null;
  }

  try {
    const state = JSON.parse(stateString) as RedirectState;
    console.log('[AUTH:STORAGE] Retrieved redirect state:', {
      source,
      state,
      age: Date.now() - state.redirectTimestamp,
    });
    return state;
  } catch (error) {
    console.error('[AUTH:STORAGE] Failed to parse redirect state:', error);
    return null;
  }
}

/**
 * Clear redirect state from BOTH storage layers
 */
export function clearRedirectState(): void {
  safeRemoveItem(localStorage, STORAGE_KEY);
  safeRemoveItem(sessionStorage, STORAGE_KEY);
  console.log('[AUTH:STORAGE] Cleared redirect state from both storage layers');
}

/**
 * Check if redirect state has expired (older than maxAge)
 */
export function isRedirectExpired(maxAge: number = MAX_REDIRECT_AGE): boolean {
  const state = getRedirectState();

  if (!state) {
    return false;
  }

  const age = Date.now() - state.redirectTimestamp;
  const expired = age > maxAge;

  if (expired) {
    console.warn('[AUTH:STORAGE] Redirect state expired:', {
      age,
      maxAge,
      timestamp: state.redirectTimestamp,
    });
  }

  return expired;
}

/**
 * Increment redirect attempt counter
 */
export function incrementRedirectAttempts(): number {
  const state = getRedirectState();

  if (!state) {
    return 0;
  }

  state.redirectAttempts += 1;
  const stateString = JSON.stringify(state);

  safeSetItem(localStorage, STORAGE_KEY, stateString);
  safeSetItem(sessionStorage, STORAGE_KEY, stateString);

  console.log('[AUTH:STORAGE] Incremented redirect attempts:', state.redirectAttempts);

  return state.redirectAttempts;
}
