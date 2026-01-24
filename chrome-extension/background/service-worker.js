/**
 * ShopSmart Travel Background Service Worker
 * Handles communication between popup, content scripts, and storage
 */

const SHOPSMART_URL = 'https://shopsmart-800cb.web.app';

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle auth success from web app (via content script)
  if (request.type === 'SHOPSMART_AUTH_SUCCESS' && request.authData) {
    console.log('ShopSmart: Received auth data from web app');

    // Store auth data
    chrome.storage.local.set({ authData: request.authData }, () => {
      console.log('ShopSmart: Auth data saved to storage');
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle auth error from web app (via content script)
  if (request.type === 'SHOPSMART_AUTH_ERROR') {
    console.error('ShopSmart: Auth error:', request.error);
    sendResponse({ success: false, error: request.error });
    return true;
  }

  if (request.action === 'getTripId') {
    // Get default trip ID from storage
    chrome.storage.local.get(['defaultTripId'], (result) => {
      sendResponse({ tripId: result.defaultTripId });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'setTripId') {
    // Save default trip ID to storage
    chrome.storage.local.set({ defaultTripId: request.tripId }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'saveTrips') {
    // Save trips list to storage (called from web app)
    chrome.storage.local.set({ trips: request.trips }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getTrips') {
    // Get trips from storage
    chrome.storage.local.get(['trips'], (result) => {
      sendResponse({ trips: result.trips || [] });
    });
    return true;
  }
});

/**
 * Listen for extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ShopSmart Travel extension installed');

    // Initialize storage
    chrome.storage.local.set({
      trips: [],
      defaultTripId: null,
    });

    // Open ShopSmart app so user can log in
    chrome.tabs.create({ url: SHOPSMART_URL });
  }
});

/**
 * Listen for messages from the ShopSmart web app
 * The web app can post messages to sync trips with the extension
 */
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Verify sender is from ShopSmart
  if (!sender.url || !sender.url.startsWith(SHOPSMART_URL)) {
    sendResponse({ error: 'Unauthorized' });
    return;
  }

  if (request.action === 'syncTrips') {
    // Web app is syncing trips
    chrome.storage.local.set({
      trips: request.trips,
      defaultTripId: request.defaultTripId || null,
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getExtensionInfo') {
    // Web app is checking if extension is installed
    sendResponse({
      installed: true,
      version: chrome.runtime.getManifest().version,
    });
    return;
  }
});

/**
 * Context menu for right-click "Add to ShopSmart"
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToShopSmart',
    title: 'Add to ShopSmart',
    contexts: ['page', 'link', 'image'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToShopSmart') {
    // Get default trip
    const result = await chrome.storage.local.get(['defaultTripId']);
    const tripId = result.defaultTripId;

    if (!tripId) {
      // No trip selected, notify user
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'ShopSmart Travel',
        message: 'Please select a default trip in the extension popup first.',
      });
      return;
    }

    // Try to scrape product data
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeProduct' });

      if (response && response.product && response.product.name) {
        const itemData = btoa(JSON.stringify(response.product));
        const url = `${SHOPSMART_URL}/trip/${tripId}?addItem=true&itemData=${encodeURIComponent(itemData)}`;
        chrome.tabs.create({ url });
      } else {
        // Open ShopSmart without product data
        chrome.tabs.create({ url: `${SHOPSMART_URL}/trip/${tripId}?addItem=true` });
      }
    } catch (error) {
      console.error('Error scraping product:', error);
      // Open ShopSmart without product data
      chrome.tabs.create({ url: `${SHOPSMART_URL}/trip/${tripId}?addItem=true` });
    }
  }
});
