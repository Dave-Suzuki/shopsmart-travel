import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

/**
 * Hook to handle extension login flow
 * When opened with ?extensionLogin=true, sends auth data back to the extension
 */
export function useExtensionAuth(user: User | null) {
  const [isExtensionLogin, setIsExtensionLogin] = useState(false);
  const [authSent, setAuthSent] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const extensionLogin = urlParams.get('extensionLogin') === 'true';
    const extensionId = urlParams.get('extensionId');

    if (extensionLogin) {
      setIsExtensionLogin(true);

      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // If user is logged in and this is an extension login, send auth data
    if (extensionLogin && user && !authSent) {
      sendAuthToExtension(user, extensionId);
      setAuthSent(true);

      // Auto-close the tab after a short delay
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  }, [user, authSent]);

  return { isExtensionLogin, authSent };
}

/**
 * Send auth data to the Chrome extension
 */
async function sendAuthToExtension(user: User, extensionId: string | null) {
  try {
    // Get the Firebase ID token
    const idToken = await user.getIdToken();

    // Get refresh token from the current user
    const refreshToken = (user as any).stsTokenManager?.refreshToken;

    const authData = {
      idToken,
      refreshToken,
      userId: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoURL,
      expiresAt: Date.now() + 3600 * 1000, // 1 hour
    };

    // Send to extension via content script (which forwards to background)
    window.postMessage(
      {
        type: 'SHOPSMART_AUTH_TO_EXTENSION',
        authData,
        extensionId,
      },
      '*'
    );

    console.log('Auth data sent to extension');
  } catch (error) {
    console.error('Failed to send auth to extension:', error);

    window.postMessage(
      {
        type: 'SHOPSMART_AUTH_ERROR',
        error: 'Failed to get auth token',
      },
      '*'
    );
  }
}
