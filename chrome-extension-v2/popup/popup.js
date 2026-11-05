/**
 * ShopSmart Travel Extension Popup
 * Uses background service worker for auth to prevent popup closing issues
 */

const SHOPSMART_URL = 'https://shopsmart-800cb.web.app/app';
const SHOPSMART_ORIGIN = 'https://shopsmart-800cb.web.app';

// Encodes a value as UTF-8 JSON in base64url, for passing items to the app in a URL.
// Must match decodePayload() in the web app (src/utils/payload.ts).
function encodePayload(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper to open or reuse existing ShopSmart tab
async function openOrReuseTab(url) {
  // Query for existing ShopSmart tabs
  const tabs = await chrome.tabs.query({ url: `${SHOPSMART_ORIGIN}/*` });

  if (tabs.length > 0) {
    // Reuse the first existing tab
    const existingTab = tabs[0];
    await chrome.tabs.update(existingTab.id, { url, active: true });
    // Focus the window containing the tab
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    // No existing tab, create a new one
    chrome.tabs.create({ url });
  }
}

// Helper to ensure content script is injected before sending message
async function sendMessageToTab(tabId, message) {
  // First, ensure content script is injected
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
  } catch (e) {
    // Script might already be injected, that's fine
    console.log('Script injection:', e.message);
  }

  // Wait for script to initialize
  await new Promise(resolve => setTimeout(resolve, 150));

  // Now send the message
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('ShopSmart popup: Initializing...');

  // Display version from manifest
  const manifest = chrome.runtime.getManifest();
  const versionBadge = document.getElementById('versionBadge');
  if (versionBadge) {
    versionBadge.textContent = `v${manifest.version}`;
  }

  // Get DOM elements
  const notConnected = document.getElementById('notConnected');
  const connectedSection = document.getElementById('connectedSection');
  const connectBtn = document.getElementById('connectBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const userPhoto = document.getElementById('userPhoto');
  const userName = document.getElementById('userName');
  const tripSelect = document.getElementById('tripSelect');
  const pageInfo = document.getElementById('pageInfo');
  const pageTypeBadge = document.getElementById('pageTypeBadge');
  const pageTypeIcon = document.getElementById('pageTypeIcon');
  const pageTypeText = document.getElementById('pageTypeText');
  const addItemBtn = document.getElementById('addItemBtn');
  const importCartBtn = document.getElementById('importCartBtn');
  const resyncBtn = document.getElementById('resyncBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Helper functions
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
    setTimeout(() => statusMessage.classList.add('hidden'), 3000);
  }

  function showNotConnected() {
    notConnected.classList.remove('hidden');
    connectedSection.classList.add('hidden');
  }

  function showConnected() {
    notConnected.classList.add('hidden');
    connectedSection.classList.remove('hidden');
  }

  function updateButtonStates() {
    const hasTripSelected = tripSelect.value !== '';
    addItemBtn.disabled = !hasTripSelected;
    importCartBtn.disabled = !hasTripSelected;
  }

  // Set up event listeners
  connectBtn.addEventListener('click', async () => {
    console.log('Sign-in clicked');
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      // Use background service worker for auth
      const response = await chrome.runtime.sendMessage({ action: 'signIn' });

      if (!response.success) {
        throw new Error(response.error || 'Sign in failed');
      }

      showStatus('Signed in! Loading trips...', 'success');
      await loadUserData(response.authData);
    } catch (error) {
      console.error('Sign in error:', error);
      showStatus(error.message || 'Sign in failed', 'error');
      connectBtn.disabled = false;
      connectBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      `;
    }
  });

  signOutBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'signOut' });
    showNotConnected();
    showStatus('Signed out', 'info');
  });

  tripSelect.addEventListener('change', async () => {
    const tripId = tripSelect.value;
    await chrome.storage.local.set({ defaultTripId: tripId });
    updateButtonStates();
    if (tripId) showStatus('Trip selected', 'success');
  });

  resyncBtn.addEventListener('click', async () => {
    resyncBtn.disabled = true;
    resyncBtn.innerHTML = '<span class="spinner"></span> Syncing...';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'fetchTrips' });

      if (!response.success) {
        throw new Error(response.error || 'Sync failed');
      }

      const result = await chrome.storage.local.get(['defaultTripId']);
      populateTrips(response.trips, result.defaultTripId);
      showStatus(`Synced ${response.trips.length} trips`, 'success');
    } catch (error) {
      console.error('Sync error:', error);
      showStatus('Sync failed', 'error');
    } finally {
      resyncBtn.disabled = false;
      resyncBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        Re-sync Trips
      `;
    }
  });

  addItemBtn.addEventListener('click', async () => {
    const tripId = tripSelect.value;
    if (!tripId) {
      showStatus('Please select a trip first', 'error');
      return;
    }

    addItemBtn.disabled = true;
    addItemBtn.innerHTML = '<span class="spinner"></span> Adding...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Active tab:', tab?.url);
      if (!tab || !tab.id) throw new Error('No active tab');

      console.log('Sending scrapeProduct message to tab', tab.id);
      const response = await sendMessageToTab(tab.id, { action: 'scrapeProduct' });
      console.log('Received response:', response);

      if (!response) {
        throw new Error('No response from content script');
      }
      if (!response.product) {
        throw new Error('No product data in response');
      }
      if (!response.product.name) {
        throw new Error('Product name is empty');
      }

      console.log('Product data:', response.product);
      const itemData = encodePayload(response.product);
      const url = `${SHOPSMART_URL}/trip/${tripId}?addItem=true&itemData=${encodeURIComponent(itemData)}`;
      console.log('Opening URL:', url);
      await openOrReuseTab(url);

      showStatus('Adding to ShopSmart...', 'success');
    } catch (error) {
      console.error('Error adding item:', error);
      showStatus(error.message || 'Failed to add item', 'error');
    } finally {
      addItemBtn.disabled = false;
      addItemBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add This Product
      `;
      updateButtonStates();
    }
  });

  importCartBtn.addEventListener('click', async () => {
    const tripId = tripSelect.value;
    if (!tripId) {
      showStatus('Please select a trip first', 'error');
      return;
    }

    importCartBtn.disabled = true;
    importCartBtn.innerHTML = '<span class="spinner"></span> Loading cart...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active tab');

      const response = await sendMessageToTab(tab.id, { action: 'scrapeCart' });

      if (!response || !response.items || response.items.length === 0) {
        throw new Error('Cart appears to be empty');
      }

      const itemsData = encodePayload(response.items);
      const url = `${SHOPSMART_URL}/trip/${tripId}/import?items=${encodeURIComponent(itemsData)}`;
      await openOrReuseTab(url);

      showStatus(`Importing ${response.items.length} items...`, 'success');
    } catch (error) {
      console.error('Error importing cart:', error);
      showStatus(error.message || 'Failed to import cart', 'error');
    } finally {
      importCartBtn.disabled = false;
      importCartBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
        Import Cart
      `;
      updateButtonStates();
    }
  });

  // Load user data
  async function loadUserData(authData) {
    showConnected();

    userName.textContent = authData.displayName || authData.email || 'User';
    if (authData.photoUrl) {
      userPhoto.src = authData.photoUrl;
      userPhoto.style.display = 'block';
    } else {
      userPhoto.style.display = 'none';
    }

    try {
      const result = await chrome.storage.local.get(['trips', 'defaultTripId']);
      let trips = result.trips || [];

      if (trips.length === 0) {
        showStatus('Loading trips...', 'info');
        const response = await chrome.runtime.sendMessage({ action: 'fetchTrips' });
        if (response.success) {
          trips = response.trips;
        }
      }

      populateTrips(trips, result.defaultTripId);
      detectPageType();
    } catch (error) {
      console.error('Error loading trips:', error);
      showStatus('Failed to load trips', 'error');
    }
  }

  function populateTrips(trips, defaultTripId) {
    tripSelect.innerHTML = '';

    if (trips.length === 0) {
      tripSelect.innerHTML = '<option value="">No trips - create one in ShopSmart</option>';
      tripSelect.disabled = true;
      return;
    }

    tripSelect.disabled = false;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a trip...';
    tripSelect.appendChild(placeholder);

    trips.forEach((trip) => {
      const option = document.createElement('option');
      option.value = trip.id;
      option.textContent = `${trip.name} - ${trip.destination}`;
      if (trip.id === defaultTripId) {
        option.selected = true;
      }
      tripSelect.appendChild(option);
    });

    updateButtonStates();
  }

  async function detectPageType() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      const response = await sendMessageToTab(tab.id, { action: 'getPageType' });

      if (response) {
        pageInfo.classList.remove('hidden');

        if (response.isCart) {
          pageTypeBadge.className = 'page-type-badge cart';
          pageTypeIcon.textContent = '🛒';
          pageTypeText.textContent = 'Cart page detected';
          importCartBtn.classList.remove('hidden');
          addItemBtn.classList.add('hidden');
        } else if (response.isProduct) {
          pageTypeBadge.className = 'page-type-badge product';
          pageTypeIcon.textContent = '📦';
          pageTypeText.textContent = 'Product page detected';
          addItemBtn.classList.remove('hidden');
          importCartBtn.classList.add('hidden');
        } else {
          pageInfo.classList.add('hidden');
        }

        updateButtonStates();
      }
    } catch (error) {
      console.debug('Could not detect page type:', error);
      pageInfo.classList.add('hidden');
    }
  }

  // Check auth state on load
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthState' });
    console.log('Auth state:', response.authData ? 'signed in' : 'not signed in');

    if (response.authData) {
      await loadUserData(response.authData);
    } else {
      showNotConnected();
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    showNotConnected();
  }
}
