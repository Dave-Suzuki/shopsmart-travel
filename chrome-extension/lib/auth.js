/**
 * Firebase Auth for Chrome Extension
 * Uses chrome.identity for Google OAuth, then exchanges for Firebase tokens
 */

const FIREBASE_API_KEY = 'AIzaSyAgVnC-isSIIr7lslRAoziTbJ-q-cQ8Ew0';
const FIREBASE_PROJECT_ID = 'shopsmart-800cb';
const SHOPSMART_URL = 'https://shopsmart-800cb.web.app';

// Google OAuth Client ID (Web application type)
// This must be configured in Google Cloud Console with the extension's redirect URI
const GOOGLE_CLIENT_ID = '541613322498-vhjp3tjjp62gojjvm2mclkbhui1b11d1.apps.googleusercontent.com';

// Expose URL globally for popup.js
window.SHOPSMART_URL = SHOPSMART_URL;

/**
 * Sign in with Google using chrome.identity
 */
async function signInWithGoogle() {
  try {
    // Get the redirect URL for this extension
    const redirectUrl = chrome.identity.getRedirectURL();
    console.log('Redirect URL:', redirectUrl);

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');

    console.log('Starting OAuth flow...');

    // Launch the auth flow
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error('No response from auth flow'));
          } else {
            resolve(response);
          }
        }
      );
    });

    console.log('OAuth response received');

    // Extract access token from response URL
    const url = new URL(responseUrl);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (!accessToken) {
      throw new Error('No access token in response');
    }

    console.log('Got Google access token, exchanging for Firebase...');

    // Exchange Google access token for Firebase auth
    const authData = await signInToFirebaseWithGoogle(accessToken);

    // Store auth data
    await chrome.storage.local.set({ authData });

    console.log('Firebase auth successful');
    return authData;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Exchange Google access token for Firebase credentials
 */
async function signInToFirebaseWithGoogle(googleAccessToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      postBody: `access_token=${googleAccessToken}&providerId=google.com`,
      requestUri: chrome.identity.getRedirectURL(),
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
 * Sign out
 */
async function signOut() {
  // Clear stored auth data
  await chrome.storage.local.remove(['authData', 'trips', 'defaultTripId']);

  // Clear the cached Google auth token
  try {
    const redirectUrl = chrome.identity.getRedirectURL();
    await new Promise((resolve) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: `https://accounts.google.com/logout`,
          interactive: false,
        },
        () => resolve()
      );
    });
  } catch (e) {
    // Ignore logout errors
  }
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

  // Check if token is expired (with 5 min buffer)
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

// Export for use in popup
window.ShopSmartAuth = {
  signInWithGoogle,
  signOut,
  getAuthState,
  fetchTrips,
};
