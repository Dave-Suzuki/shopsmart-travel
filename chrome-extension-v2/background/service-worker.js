/**
 * ShopSmart Travel Background Service Worker
 * Handles OAuth flow to prevent popup closing issues
 */

const FIREBASE_API_KEY = 'AIzaSyAgVnC-isSIIr7lslRAoziTbJ-q-cQ8Ew0';
const FIREBASE_PROJECT_ID = 'shopsmart-800cb';
const SHOPSMART_URL = 'https://shopsmart-800cb.web.app';
const GOOGLE_CLIENT_ID = '319755053913-s4qmm29pa9uprv6d24o922qhiatevs4t.apps.googleusercontent.com';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ShopSmart Travel extension installed');
    chrome.storage.local.set({ trips: [], defaultTripId: null });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'signIn') {
    signInWithGoogle()
      .then(authData => sendResponse({ success: true, authData }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'signOut') {
    chrome.storage.local.remove(['authData', 'trips', 'defaultTripId'])
      .then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'getAuthState') {
    getAuthState()
      .then(authData => sendResponse({ authData }))
      .catch(() => sendResponse({ authData: null }));
    return true;
  }

  if (request.action === 'fetchTrips') {
    getAuthState()
      .then(authData => {
        if (authData) return fetchTrips(authData);
        throw new Error('Not authenticated');
      })
      .then(trips => sendResponse({ success: true, trips }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getTripId') {
    chrome.storage.local.get(['defaultTripId'], (result) => {
      sendResponse({ tripId: result.defaultTripId });
    });
    return true;
  }

  if (request.action === 'getTrips') {
    chrome.storage.local.get(['trips'], (result) => {
      sendResponse({ trips: result.trips || [] });
    });
    return true;
  }
});

/**
 * Sign in with Google using chrome.identity
 */
async function signInWithGoogle() {
  const redirectUrl = chrome.identity.getRedirectURL();
  console.log('Redirect URL:', redirectUrl);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUrl);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('prompt', 'select_account');

  console.log('Starting OAuth flow...');

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Auth error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error('No response from auth flow'));
        } else {
          resolve(response);
        }
      }
    );
  });

  console.log('Response URL:', responseUrl);

  // Extract access_token from response URL hash
  const url = new URL(responseUrl);
  const hashParams = new URLSearchParams(url.hash.substring(1));
  const accessToken = hashParams.get('access_token');

  if (!accessToken) {
    throw new Error('No access token in response');
  }

  // Exchange Google access token for Firebase auth
  const authData = await signInToFirebaseWithGoogle(accessToken);
  await chrome.storage.local.set({ authData });

  console.log('Firebase auth successful');
  return authData;
}

/**
 * Exchange Google access token for Firebase credentials
 */
async function signInToFirebaseWithGoogle(googleAccessToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `access_token=${googleAccessToken}&providerId=google.com`,
      requestUri: SHOPSMART_URL,
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Firebase signIn error:', error);
    throw new Error(error.error?.message || 'Firebase authentication failed');
  }

  const data = await response.json();

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    userId: data.localId,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    expiresAt: Date.now() + parseInt(data.expiresIn) * 1000,
  };
}

/**
 * Get current auth state
 */
async function getAuthState() {
  const result = await chrome.storage.local.get(['authData']);
  const authData = result.authData;

  if (!authData) {
    return null;
  }

  if (authData.expiresAt && authData.expiresAt < Date.now() + 300000) {
    try {
      const refreshed = await refreshToken(authData.refreshToken);
      return refreshed;
    } catch {
      await chrome.storage.local.remove(['authData']);
      return null;
    }
  }

  return authData;
}

/**
 * Refresh the Firebase token
 */
async function refreshToken(token) {
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${token}`,
    }
  );

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  const existing = await chrome.storage.local.get(['authData']);

  const authData = {
    ...existing.authData,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    userId: data.user_id,
    expiresAt: Date.now() + parseInt(data.expires_in) * 1000,
  };

  await chrome.storage.local.set({ authData });
  return authData;
}

/**
 * Fetch trips from Firestore
 */
async function fetchTrips(authData) {
  const userId = authData.userId;
  const idToken = authData.idToken;

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'trips' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'owners' },
            op: 'ARRAY_CONTAINS',
            value: { stringValue: userId },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Firestore query failed:', error);
    throw new Error('Failed to fetch trips');
  }

  const results = await response.json();

  const trips = results
    .filter((r) => r.document)
    .map((r) => {
      const doc = r.document;
      const id = doc.name.split('/').pop();
      const fields = doc.fields;

      return {
        id,
        name: fields.name?.stringValue || 'Unnamed Trip',
        destination: fields.destination?.stringValue || '',
        budgetCurrency: fields.budgetCurrency?.stringValue || 'USD',
      };
    });

  await chrome.storage.local.set({
    trips,
    defaultTripId: trips[0]?.id || null,
  });

  return trips;
}
