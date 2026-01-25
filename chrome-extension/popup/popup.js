/**
 * ShopSmart Travel Extension Popup
 */

// SHOPSMART_URL is defined in auth.js and exposed via window.SHOPSMART_URL

/**
 * Helper to open or reuse existing ShopSmart tab
 */
async function openOrReuseTab(url) {
  const baseUrl = window.SHOPSMART_URL || 'https://shopsmart-800cb.web.app';
  const tabs = await chrome.tabs.query({ url: `${baseUrl}/*` });

  if (tabs.length > 0) {
    const existingTab = tabs[0];
    await chrome.tabs.update(existingTab.id, { url, active: true });
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    chrome.tabs.create({ url });
  }
}

// DOM elements - will be set after DOM loads
let notConnected;
let connectedSection;
let connectBtn;
let signOutBtn;
let userPhoto;
let userName;
let tripSelect;
let pageInfo;
let pageTypeBadge;
let pageTypeIcon;
let pageTypeText;
let addItemBtn;
let importCartBtn;
let resyncBtn;
let statusMessage;

/**
 * Initialize popup
 */
async function init() {
  console.log('ShopSmart popup: Initializing...');

  // Get DOM elements
  notConnected = document.getElementById('notConnected');
  connectedSection = document.getElementById('connectedSection');
  connectBtn = document.getElementById('connectBtn');
  signOutBtn = document.getElementById('signOutBtn');
  userPhoto = document.getElementById('userPhoto');
  userName = document.getElementById('userName');
  tripSelect = document.getElementById('tripSelect');
  pageInfo = document.getElementById('pageInfo');
  pageTypeBadge = document.getElementById('pageTypeBadge');
  pageTypeIcon = document.getElementById('pageTypeIcon');
  pageTypeText = document.getElementById('pageTypeText');
  addItemBtn = document.getElementById('addItemBtn');
  importCartBtn = document.getElementById('importCartBtn');
  resyncBtn = document.getElementById('resyncBtn');
  statusMessage = document.getElementById('statusMessage');

  // Set up event listeners FIRST (before any async operations)
  if (connectBtn) {
    connectBtn.addEventListener('click', handleSignIn);
    console.log('ShopSmart popup: Sign-in button listener attached');
  } else {
    console.error('ShopSmart popup: connectBtn not found!');
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }

  if (tripSelect) {
    tripSelect.addEventListener('change', handleTripChange);
  }

  if (addItemBtn) {
    addItemBtn.addEventListener('click', handleAddItem);
  }

  if (importCartBtn) {
    importCartBtn.addEventListener('click', handleImportCart);
  }

  if (resyncBtn) {
    resyncBtn.addEventListener('click', handleResync);
  }

  // Check if auth module loaded
  if (!window.ShopSmartAuth) {
    console.error('ShopSmart popup: Auth module not loaded!');
    showStatus('Extension error - please reload', 'error');
    return;
  }

  // Now check auth state
  try {
    const authData = await window.ShopSmartAuth.getAuthState();
    console.log('ShopSmart popup: Auth state:', authData ? 'signed in' : 'not signed in');

    if (!authData) {
      showNotConnected();
    } else {
      await loadUserData(authData);
    }
  } catch (error) {
    console.error('ShopSmart popup: Error checking auth state:', error);
    showNotConnected();
  }
}

/**
 * Show not connected state
 */
function showNotConnected() {
  if (notConnected) notConnected.classList.remove('hidden');
  if (connectedSection) connectedSection.classList.add('hidden');
}

/**
 * Load user data and show connected state
 */
async function loadUserData(authData) {
  if (notConnected) notConnected.classList.add('hidden');
  if (connectedSection) connectedSection.classList.remove('hidden');

  // Show user info
  if (userName) {
    userName.textContent = authData.displayName || authData.email || 'User';
  }
  if (userPhoto) {
    if (authData.photoUrl) {
      userPhoto.src = authData.photoUrl;
      userPhoto.style.display = 'block';
    } else {
      userPhoto.style.display = 'none';
    }
  }

  // Load trips
  try {
    const result = await chrome.storage.local.get(['trips', 'defaultTripId']);
    let trips = result.trips || [];

    // If no trips cached, fetch from Firestore
    if (trips.length === 0) {
      showStatus('Loading trips...', 'info');
      trips = await window.ShopSmartAuth.fetchTrips(authData);
    }

    populateTrips(trips, result.defaultTripId);
    detectPageType();
  } catch (error) {
    console.error('Error loading trips:', error);
    showStatus('Failed to load trips', 'error');
  }
}

/**
 * Populate trip dropdown
 */
function populateTrips(trips, defaultTripId) {
  if (!tripSelect) return;

  tripSelect.innerHTML = '';

  if (trips.length === 0) {
    tripSelect.innerHTML = '<option value="">No trips found - create one in ShopSmart</option>';
    tripSelect.disabled = true;
    return;
  }

  tripSelect.disabled = false;

  // Add placeholder
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a trip...';
  tripSelect.appendChild(placeholder);

  // Add trips
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

/**
 * Handle sign in
 */
async function handleSignIn() {
  console.log('ShopSmart popup: Sign-in clicked');

  if (!connectBtn) return;

  connectBtn.disabled = true;
  connectBtn.innerHTML = `
    <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
    </svg>
    Signing in...
  `;

  try {
    console.log('ShopSmart popup: Calling signInWithGoogle...');
    const authData = await window.ShopSmartAuth.signInWithGoogle();
    console.log('ShopSmart popup: Sign-in successful');
    showStatus('Signed in! Loading trips...', 'success');

    // Fetch trips
    await window.ShopSmartAuth.fetchTrips(authData);

    // Reload UI
    await loadUserData(authData);
  } catch (error) {
    console.error('Sign in error:', error);
    showStatus(error.message || 'Sign in failed', 'error');

    // Reset button
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
}

/**
 * Handle sign out
 */
async function handleSignOut() {
  await window.ShopSmartAuth.signOut();
  showNotConnected();
  showStatus('Signed out', 'info');
}

/**
 * Handle trip selection change
 */
async function handleTripChange() {
  if (!tripSelect) return;
  const tripId = tripSelect.value;
  await chrome.storage.local.set({ defaultTripId: tripId });
  updateButtonStates();
  if (tripId) {
    showStatus('Trip selected', 'success');
  }
}

/**
 * Handle re-sync button click
 */
async function handleResync() {
  if (!resyncBtn) return;

  resyncBtn.disabled = true;
  resyncBtn.innerHTML = `
    <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
    </svg>
    Syncing...
  `;

  try {
    const authData = await window.ShopSmartAuth.getAuthState();
    if (authData) {
      const trips = await window.ShopSmartAuth.fetchTrips(authData);
      const result = await chrome.storage.local.get(['defaultTripId']);
      populateTrips(trips, result.defaultTripId);
      showStatus(`Synced ${trips.length} trips`, 'success');
    }
  } catch (error) {
    console.error('Sync error:', error);
    showStatus('Sync failed', 'error');
  } finally {
    resyncBtn.disabled = false;
    resyncBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      Re-sync Trips
    `;
  }
}

/**
 * Detect current page type
 */
async function detectPageType() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageType' });

    if (response && pageInfo) {
      pageInfo.classList.remove('hidden');

      if (response.isCart) {
        if (pageTypeBadge) pageTypeBadge.className = 'page-type-badge cart';
        if (pageTypeIcon) pageTypeIcon.textContent = '🛒';
        if (pageTypeText) pageTypeText.textContent = 'Cart page detected';
        if (importCartBtn) importCartBtn.classList.remove('hidden');
        if (addItemBtn) addItemBtn.classList.add('hidden');
      } else if (response.isProduct) {
        if (pageTypeBadge) pageTypeBadge.className = 'page-type-badge product';
        if (pageTypeIcon) pageTypeIcon.textContent = '📦';
        if (pageTypeText) pageTypeText.textContent = 'Product page detected';
        if (addItemBtn) addItemBtn.classList.remove('hidden');
        if (importCartBtn) importCartBtn.classList.add('hidden');
      } else {
        pageInfo.classList.add('hidden');
      }

      updateButtonStates();
    }
  } catch (error) {
    console.debug('Could not detect page type:', error);
    if (pageInfo) pageInfo.classList.add('hidden');
  }
}

/**
 * Update button states
 */
function updateButtonStates() {
  const hasTripSelected = tripSelect && tripSelect.value !== '';
  if (addItemBtn) addItemBtn.disabled = !hasTripSelected;
  if (importCartBtn) importCartBtn.disabled = !hasTripSelected;
}

/**
 * Handle Add Item button click
 */
async function handleAddItem() {
  if (!tripSelect) return;

  const tripId = tripSelect.value;
  if (!tripId) {
    showStatus('Please select a trip first', 'error');
    return;
  }

  setButtonLoading(addItemBtn, true, 'Adding...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab');

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeProduct' });

    if (!response || !response.product || !response.product.name) {
      throw new Error('Could not extract product data');
    }

    const itemData = btoa(JSON.stringify(response.product));
    const url = `${window.SHOPSMART_URL}/trip/${tripId}?addItem=true&itemData=${encodeURIComponent(itemData)}`;
    await openOrReuseTab(url);

    showStatus('Adding to ShopSmart...', 'success');
  } catch (error) {
    console.error('Error adding item:', error);
    showStatus(error.message || 'Failed to add item', 'error');
  } finally {
    setButtonLoading(addItemBtn, false, 'Add This Product');
  }
}

/**
 * Handle Import Cart button click
 */
async function handleImportCart() {
  if (!tripSelect) return;

  const tripId = tripSelect.value;
  if (!tripId) {
    showStatus('Please select a trip first', 'error');
    return;
  }

  setButtonLoading(importCartBtn, true, 'Loading cart...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab');

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeCart' });

    if (!response || !response.items || response.items.length === 0) {
      throw new Error('Cart appears to be empty');
    }

    const itemsData = btoa(JSON.stringify(response.items));
    const url = `${window.SHOPSMART_URL}/trip/${tripId}/import?items=${encodeURIComponent(itemsData)}`;
    await openOrReuseTab(url);

    showStatus(`Importing ${response.items.length} items...`, 'success');
  } catch (error) {
    console.error('Error importing cart:', error);
    showStatus(error.message || 'Failed to import cart', 'error');
  } finally {
    setButtonLoading(importCartBtn, false, 'Import Cart');
  }
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loading, text) {
  if (!button) return;

  button.disabled = loading;
  if (loading) {
    button.innerHTML = `
      <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
      </svg>
      ${text}
    `;
  } else {
    if (button === addItemBtn) {
      button.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        ${text}
      `;
    } else if (button === importCartBtn) {
      button.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
        ${text}
      `;
    }
    updateButtonStates();
  }
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');

  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
