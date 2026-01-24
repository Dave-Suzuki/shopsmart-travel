/**
 * ShopSmart Sync Content Script
 * Runs only on shopsmart-800cb.web.app to:
 * 1. Sync trips to extension storage
 * 2. Forward auth data from web app to extension background
 */

(function () {
  'use strict';

  const EXTENSION_SYNC_KEY = 'shopsmart_extension_trips';

  /**
   * Read trips from localStorage and sync to chrome.storage
   */
  function syncTripsToExtension() {
    try {
      const syncDataStr = localStorage.getItem(EXTENSION_SYNC_KEY);
      if (!syncDataStr) return;

      const syncData = JSON.parse(syncDataStr);
      if (!syncData.trips || syncData.trips.length === 0) return;

      // Save to chrome.storage
      chrome.storage.local.set({
        trips: syncData.trips,
        defaultTripId: syncData.defaultTripId || syncData.trips[0]?.id,
      }, () => {
        console.log('ShopSmart: Synced', syncData.trips.length, 'trips to extension');
      });
    } catch (e) {
      console.debug('ShopSmart: Sync error', e);
    }
  }

  // Sync on page load
  syncTripsToExtension();

  // Listen for updates from the app
  window.addEventListener('shopsmart-trips-updated', (event) => {
    const syncData = event.detail;
    if (syncData && syncData.trips) {
      chrome.storage.local.set({
        trips: syncData.trips,
        defaultTripId: syncData.defaultTripId || syncData.trips[0]?.id,
      }, () => {
        console.log('ShopSmart: Live synced', syncData.trips.length, 'trips to extension');
      });
    }
  });

  // Also check periodically in case localStorage was updated by another tab
  setInterval(syncTripsToExtension, 5000);

  /**
   * Listen for auth messages from the web app and forward to extension background
   */
  window.addEventListener('message', (event) => {
    // Only accept messages from the same origin
    if (event.origin !== window.location.origin) return;

    const { type, authData, error } = event.data || {};

    if (type === 'SHOPSMART_AUTH_TO_EXTENSION' && authData) {
      console.log('ShopSmart: Received auth data from web app, forwarding to extension...');

      // Forward to extension background script
      chrome.runtime.sendMessage({
        type: 'SHOPSMART_AUTH_SUCCESS',
        authData: authData,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('ShopSmart: Failed to forward auth to extension:', chrome.runtime.lastError);
        } else {
          console.log('ShopSmart: Auth forwarded to extension successfully');
        }
      });
    } else if (type === 'SHOPSMART_AUTH_ERROR') {
      console.error('ShopSmart: Auth error from web app:', error);

      // Forward error to extension background script
      chrome.runtime.sendMessage({
        type: 'SHOPSMART_AUTH_ERROR',
        error: error || 'Authentication failed',
      });
    }
  });

  console.log('ShopSmart: Sync content script loaded');
})();
