/**
 * Shopify store scraper
 * Detects Shopify stores and uses /cart.js API for reliable cart data
 */

window.ShopSmartScrapers = window.ShopSmartScrapers || {};

window.ShopSmartScrapers.shopify = {
  name: 'shopify',

  /**
   * Check if this is a Shopify store
   */
  isSupported() {
    // Check for Shopify global object
    if (typeof window.Shopify !== 'undefined') {
      return true;
    }

    // Check for Shopify meta tags
    const shopifyMeta = document.querySelector('meta[name="shopify-checkout-api-token"]');
    if (shopifyMeta) {
      return true;
    }

    // Check for Shopify in scripts
    const scripts = document.querySelectorAll('script[src*="shopify"]');
    if (scripts.length > 0) {
      return true;
    }

    return false;
  },

  /**
   * Check if this is a cart page
   */
  isCartPage() {
    const pathname = window.location.pathname.toLowerCase();
    return pathname.includes('/cart');
  },

  /**
   * Check if this is a product page
   */
  isProductPage() {
    const pathname = window.location.pathname.toLowerCase();
    return pathname.includes('/products/');
  },

  /**
   * Scrape cart items using Shopify's cart.js API
   */
  async scrapeCart() {
    try {
      const response = await fetch('/cart.js');
      if (!response.ok) {
        throw new Error('Failed to fetch cart data');
      }

      const cartData = await response.json();

      if (!cartData.items || cartData.items.length === 0) {
        return [];
      }

      // Get store currency
      const currency = cartData.currency || this._detectCurrency();

      return cartData.items.map((item) => ({
        name: item.title || item.product_title,
        price: item.price / 100, // Shopify stores prices in cents
        currency: currency,
        quantity: item.quantity,
        brand: item.vendor || null,
        imageUrl: item.image ? this._normalizeImageUrl(item.image) : null,
        description: item.variant_title || null,
        productUrl: item.url ? `${window.location.origin}${item.url}` : null,
      }));
    } catch (error) {
      console.error('ShopSmart: Error scraping Shopify cart', error);
      return this._scrapeCartFromDom();
    }
  },

  /**
   * Scrape product data from product page
   */
  scrapeProduct() {
    // Try to get product data from Shopify's JavaScript object
    if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
      const p = window.ShopifyAnalytics.meta.product;
      return {
        name: p.title,
        price: p.price ? p.price / 100 : null,
        currency: this._detectCurrency(),
        brand: p.vendor,
        imageUrl: p.images ? this._normalizeImageUrl(p.images[0]) : null,
        productUrl: window.location.href,
      };
    }

    // Try to get from product JSON
    const productJson = document.querySelector('script[data-product-json]');
    if (productJson) {
      try {
        const product = JSON.parse(productJson.textContent);
        return {
          name: product.title,
          price: product.price ? product.price / 100 : (product.variants?.[0]?.price / 100),
          currency: this._detectCurrency(),
          brand: product.vendor,
          imageUrl: product.featured_image ? this._normalizeImageUrl(product.featured_image) : null,
          description: product.description ? this._stripHtml(product.description) : null,
          productUrl: window.location.href,
        };
      } catch (e) {
        console.debug('ShopSmart: Error parsing product JSON', e);
      }
    }

    // Fall back to generic scraper
    return window.ShopSmartScrapers.generic.scrapeProduct();
  },

  /**
   * Detect store currency
   */
  _detectCurrency() {
    // Try Shopify currency
    if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
      return window.Shopify.currency.active;
    }

    // Try from meta
    const currencyMeta = document.querySelector('meta[itemprop="priceCurrency"]');
    if (currencyMeta) {
      return currencyMeta.content;
    }

    // Default
    return 'USD';
  },

  /**
   * Normalize Shopify image URL (ensure it has protocol)
   */
  _normalizeImageUrl(url) {
    if (!url) return null;

    if (url.startsWith('//')) {
      return 'https:' + url;
    }

    if (!url.startsWith('http')) {
      return 'https://' + url;
    }

    return url;
  },

  /**
   * Strip HTML tags from string
   */
  _stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },

  /**
   * Fallback: Scrape cart items from DOM
   */
  _scrapeCartFromDom() {
    const items = [];

    // Common Shopify cart item selectors
    const itemSelectors = [
      '.cart-item',
      '.cart__item',
      '[data-cart-item]',
      '.cart-row',
      'tr.cart_item',
    ];

    let cartItems = [];
    for (const selector of itemSelectors) {
      cartItems = document.querySelectorAll(selector);
      if (cartItems.length > 0) break;
    }

    cartItems.forEach((item) => {
      const nameEl = item.querySelector('.cart-item__title, .cart__item-title, [data-cart-item-title], .product-name, a[href*="/products/"]');
      const priceEl = item.querySelector('.cart-item__price, .cart__item-price, [data-cart-item-price], .price, .money');
      const imageEl = item.querySelector('img');
      const quantityEl = item.querySelector('input[type="number"], [data-quantity-input], .quantity input');

      if (nameEl) {
        const priceText = priceEl ? priceEl.textContent : '';
        const priceMatch = priceText.match(/[\d,.]+/);

        items.push({
          name: nameEl.textContent.trim(),
          price: priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null,
          currency: this._detectCurrency(),
          quantity: quantityEl ? parseInt(quantityEl.value) || 1 : 1,
          imageUrl: imageEl ? this._normalizeImageUrl(imageEl.src) : null,
          productUrl: nameEl.href || null,
        });
      }
    });

    return items;
  },
};
