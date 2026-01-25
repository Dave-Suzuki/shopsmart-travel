/**
 * ShopSmart Travel Content Script
 * Detects product/cart pages and shows appropriate buttons
 */

(function () {
  'use strict';

  // ShopSmart app URL
  const SHOPSMART_URL = 'https://shopsmart-800cb.web.app';
  const EXTENSION_SYNC_KEY = 'shopsmart_extension_trips';

  /**
   * Get trip data from the ShopSmart app's localStorage (if on ShopSmart domain)
   * or from chrome.storage (synced from app)
   */
  async function getTripId() {
    // First try chrome.storage
    try {
      const result = await chrome.storage.local.get(['defaultTripId']);
      if (result.defaultTripId) {
        return result.defaultTripId;
      }
    } catch (e) {
      console.debug('ShopSmart: Could not read from chrome.storage', e);
    }
    return null;
  }

  // Button IDs
  const PRODUCT_BUTTON_ID = 'shopsmart-add-button';
  const CART_BUTTON_ID = 'shopsmart-import-button';

  // Track initialization
  let initialized = false;

  /**
   * Get the appropriate scraper for this site
   */
  function getActiveScraper() {
    const scrapers = window.ShopSmartScrapers;

    // Check platform-specific scrapers first
    if (scrapers.shopify && scrapers.shopify.isSupported()) {
      return scrapers.shopify;
    }

    if (scrapers.sfcc && scrapers.sfcc.isSupported()) {
      return scrapers.sfcc;
    }

    // Fall back to generic
    return scrapers.generic;
  }

  /**
   * Create the floating "Add to ShopSmart" button
   */
  function createProductButton() {
    if (document.getElementById(PRODUCT_BUTTON_ID)) {
      return;
    }

    const button = document.createElement('button');
    button.id = PRODUCT_BUTTON_ID;
    button.className = 'shopsmart-floating-btn';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span>Add to ShopSmart</span>
    `;

    button.addEventListener('click', handleAddProduct);
    document.body.appendChild(button);
  }

  /**
   * Create the floating "Import Cart" button
   */
  function createCartButton() {
    if (document.getElementById(CART_BUTTON_ID)) {
      return;
    }

    const button = document.createElement('button');
    button.id = CART_BUTTON_ID;
    button.className = 'shopsmart-floating-btn shopsmart-cart-btn';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
      <span>Import to ShopSmart</span>
    `;

    button.addEventListener('click', handleImportCart);
    document.body.appendChild(button);
  }

  /**
   * Remove all ShopSmart buttons
   */
  function removeButtons() {
    const productBtn = document.getElementById(PRODUCT_BUTTON_ID);
    const cartBtn = document.getElementById(CART_BUTTON_ID);
    if (productBtn) productBtn.remove();
    if (cartBtn) cartBtn.remove();
  }

  /**
   * Handle "Add to ShopSmart" button click
   */
  async function handleAddProduct() {
    const button = document.getElementById(PRODUCT_BUTTON_ID);
    if (!button) return;

    // Show loading state
    const originalContent = button.innerHTML;
    button.innerHTML = `
      <svg class="shopsmart-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
      </svg>
      <span>Adding...</span>
    `;
    button.disabled = true;

    try {
      const scraper = getActiveScraper();
      const product = scraper.scrapeProduct();

      if (!product || !product.name) {
        throw new Error('Could not extract product data');
      }

      // Get saved trip ID from storage
      const result = await chrome.storage.local.get(['defaultTripId']);
      const tripId = result.defaultTripId;

      if (!tripId) {
        // No trip selected, show popup message
        showNotification('Please select a trip in the ShopSmart extension popup first', 'warning');
        button.innerHTML = originalContent;
        button.disabled = false;
        return;
      }

      // Encode product data
      const itemData = btoa(JSON.stringify(product));

      // Open ShopSmart with deep link (reuse existing tab)
      const url = `${SHOPSMART_URL}/trip/${tripId}?addItem=true&itemData=${encodeURIComponent(itemData)}`;
      chrome.runtime.sendMessage({ action: 'openShopSmart', url });

      // Show success
      showNotification('Opening ShopSmart...', 'success');
    } catch (error) {
      console.error('ShopSmart: Error adding product', error);
      showNotification('Could not extract product data', 'error');
    } finally {
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  }

  /**
   * Handle "Import Cart" button click
   */
  async function handleImportCart() {
    const button = document.getElementById(CART_BUTTON_ID);
    if (!button) return;

    // Show loading state
    const originalContent = button.innerHTML;
    button.innerHTML = `
      <svg class="shopsmart-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
      </svg>
      <span>Loading cart...</span>
    `;
    button.disabled = true;

    try {
      const scraper = getActiveScraper();
      const items = await scraper.scrapeCart();

      if (!items || items.length === 0) {
        throw new Error('Cart appears to be empty');
      }

      // Get saved trip ID from storage
      const result = await chrome.storage.local.get(['defaultTripId']);
      const tripId = result.defaultTripId;

      if (!tripId) {
        showNotification('Please select a trip in the ShopSmart extension popup first', 'warning');
        button.innerHTML = originalContent;
        button.disabled = false;
        return;
      }

      // Encode items data
      const itemsData = btoa(JSON.stringify(items));

      // Open ShopSmart bulk import page (reuse existing tab)
      const url = `${SHOPSMART_URL}/trip/${tripId}/import?items=${encodeURIComponent(itemsData)}`;
      chrome.runtime.sendMessage({ action: 'openShopSmart', url });

      showNotification(`Opening ShopSmart with ${items.length} item${items.length !== 1 ? 's' : ''}...`, 'success');
    } catch (error) {
      console.error('ShopSmart: Error importing cart', error);
      showNotification(error.message || 'Could not import cart', 'error');
    } finally {
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  }

  /**
   * Show a notification toast
   */
  function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existing = document.querySelector('.shopsmart-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `shopsmart-notification shopsmart-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('shopsmart-notification-hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Detect page type and show appropriate buttons
   */
  function detectAndShowButtons() {
    const scraper = getActiveScraper();

    // Check for cart page first
    if (scraper.isCartPage && scraper.isCartPage()) {
      removeButtons();
      createCartButton();
      return;
    }

    // Check for product page
    if (scraper.isProductPage && scraper.isProductPage()) {
      removeButtons();
      createProductButton();
      return;
    }

    // For generic scraper, check if it looks like a product page
    if (scraper.name === 'generic' && scraper.isProductPage()) {
      removeButtons();
      createProductButton();
      return;
    }

    // Remove buttons if not on product or cart page
    removeButtons();
  }

  /**
   * Initialize the content script
   */
  function init() {
    if (initialized) return;
    initialized = true;

    // Initial detection
    detectAndShowButtons();

    // Re-check on URL changes (for SPAs)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(detectAndShowButtons, 500); // Small delay for page to update
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(detectAndShowButtons, 500);
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'scrapeProduct') {
        const scraper = getActiveScraper();
        const product = scraper.scrapeProduct();
        sendResponse({ product });
      } else if (request.action === 'scrapeCart') {
        const scraper = getActiveScraper();
        scraper.scrapeCart().then((items) => {
          sendResponse({ items });
        });
        return true; // Keep channel open for async response
      } else if (request.action === 'getPageType') {
        const scraper = getActiveScraper();
        const isCart = scraper.isCartPage && scraper.isCartPage();
        const isProduct = scraper.isProductPage ? scraper.isProductPage() : scraper.isProductPage();
        sendResponse({ isCart, isProduct, scraperName: scraper.name });
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
