/**
 * Salesforce Commerce Cloud (SFCC/Demandware) scraper
 * Used by: Adidas, Puma, Burberry, L'Oreal, many luxury brands
 */

window.ShopSmartScrapers = window.ShopSmartScrapers || {};

window.ShopSmartScrapers.sfcc = {
  name: 'sfcc',

  /**
   * Check if this is an SFCC/Demandware store
   */
  isSupported() {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();

    // Check for demandware in URL
    if (url.includes('demandware.store') || url.includes('demandware.net')) {
      return true;
    }

    // Check for SFCC analytics object
    if (typeof window.dwanalytics !== 'undefined' || typeof window.dw !== 'undefined') {
      return true;
    }

    // Check for SFCC-specific elements
    const sfccIndicators = document.querySelectorAll('[data-action*="Cart"], .dwfrm, [name*="dwfrm"]');
    if (sfccIndicators.length > 0) {
      return true;
    }

    // Check for SFCC in scripts
    const scripts = Array.from(document.querySelectorAll('script')).some(
      (s) => s.src.includes('demandware') || s.textContent.includes('SiteGenesis')
    );
    if (scripts) {
      return true;
    }

    return false;
  },

  /**
   * Check if this is a cart page
   */
  isCartPage() {
    const pathname = window.location.pathname.toLowerCase();
    const url = window.location.href.toLowerCase();

    return (
      pathname.includes('/cart') ||
      pathname.includes('/basket') ||
      url.includes('cart-show') ||
      url.includes('cart/show')
    );
  },

  /**
   * Check if this is a product page
   */
  isProductPage() {
    const pathname = window.location.pathname.toLowerCase();
    return pathname.includes('/product/') || pathname.includes('/p/');
  },

  /**
   * Scrape cart items from SFCC store
   */
  async scrapeCart() {
    // Try to get cart data from page's JavaScript
    const cartFromJs = this._getCartFromJs();
    if (cartFromJs && cartFromJs.length > 0) {
      return cartFromJs;
    }

    // Fall back to DOM scraping
    return this._scrapeCartFromDom();
  },

  /**
   * Scrape product from product page
   */
  scrapeProduct() {
    // Try to get from __NEXT_DATA__ (for Next.js SFCC implementations)
    const nextData = document.querySelector('script#__NEXT_DATA__');
    if (nextData) {
      try {
        const data = JSON.parse(nextData.textContent);
        const product = this._findProductInData(data);
        if (product) return product;
      } catch (e) {
        console.debug('ShopSmart: Error parsing __NEXT_DATA__', e);
      }
    }

    // Try to get from window.Resources or similar
    if (window.Resources && window.Resources.PRODUCT) {
      const p = window.Resources.PRODUCT;
      return {
        name: p.name || p.productName,
        price: p.price || p.salePrice,
        currency: p.currency || this._detectCurrency(),
        brand: p.brand || p.brandName,
        imageUrl: p.image || p.imageUrl,
        productUrl: window.location.href,
      };
    }

    // Fall back to generic scraper
    return window.ShopSmartScrapers.generic.scrapeProduct();
  },

  /**
   * Try to get cart data from JavaScript objects
   */
  _getCartFromJs() {
    const items = [];

    // Try window.pageContext (common in SFCC)
    if (window.pageContext && window.pageContext.cart) {
      const cart = window.pageContext.cart;
      const cartItems = cart.items || cart.products || cart.lineItems;

      if (cartItems) {
        cartItems.forEach((item) => {
          items.push({
            name: item.name || item.productName || item.title,
            price: item.price || item.salePrice || item.unitPrice,
            currency: this._detectCurrency(),
            quantity: item.quantity || item.qty || 1,
            brand: item.brand || item.brandName,
            imageUrl: item.image || item.imageUrl || item.imgSrc,
            productUrl: item.url || item.productUrl,
          });
        });
      }
    }

    // Try minicart data
    if (window.minicart && window.minicart.items) {
      window.minicart.items.forEach((item) => {
        items.push({
          name: item.productName || item.name,
          price: item.price,
          currency: this._detectCurrency(),
          quantity: item.quantity || 1,
          imageUrl: item.imageURL || item.image,
        });
      });
    }

    return items;
  },

  /**
   * Scrape cart items from DOM
   */
  _scrapeCartFromDom() {
    const items = [];

    // Common SFCC cart item selectors
    const itemSelectors = [
      '.cart-row',
      '.product-line-item',
      '.cart-item',
      '.line-item',
      '[data-product-line-item]',
      '.cart__item',
      'tr.cart_item',
    ];

    let cartItems = [];
    for (const selector of itemSelectors) {
      cartItems = document.querySelectorAll(selector);
      if (cartItems.length > 0) break;
    }

    cartItems.forEach((item) => {
      // Try multiple name selectors
      const nameSelectors = [
        '.product-line-item-details .line-item-name',
        '.product-name a',
        '.item-name',
        '.line-item-name',
        '[data-product-name]',
        '.name a',
        'h3 a',
        'h4 a',
      ];

      let nameEl = null;
      for (const selector of nameSelectors) {
        nameEl = item.querySelector(selector);
        if (nameEl) break;
      }

      // Try multiple price selectors
      const priceSelectors = [
        '.line-item-total-price .value',
        '.line-item-price .value',
        '.price .value',
        '.item-price',
        '[data-product-price]',
        '.price-sales',
        '.product-price',
      ];

      let priceEl = null;
      for (const selector of priceSelectors) {
        priceEl = item.querySelector(selector);
        if (priceEl) break;
      }

      const imageEl = item.querySelector('img.product-image, .line-item-image img, .item-image img, img');
      const quantityEl = item.querySelector('input[name*="quantity"], .quantity-value, .qty-value, select.quantity');

      if (nameEl) {
        const priceText = priceEl ? priceEl.textContent : '';
        const priceMatch = priceText.match(/[\d,.]+/);

        items.push({
          name: nameEl.textContent.trim(),
          price: priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null,
          currency: this._detectCurrency(),
          quantity: quantityEl ? (parseInt(quantityEl.value) || parseInt(quantityEl.textContent) || 1) : 1,
          imageUrl: imageEl ? imageEl.src : null,
          productUrl: nameEl.href || null,
        });
      }
    });

    return items;
  },

  /**
   * Find product in nested data structure
   */
  _findProductInData(data, depth = 0) {
    if (depth > 10) return null; // Prevent infinite recursion

    if (!data || typeof data !== 'object') return null;

    // Check if this object looks like a product
    if (data.name && (data.price || data.prices) && !data.items) {
      return {
        name: data.name,
        price: typeof data.price === 'number' ? data.price : data.prices?.sale || data.prices?.list,
        currency: data.currency || this._detectCurrency(),
        brand: data.brand?.name || data.brand,
        imageUrl: data.image?.url || data.images?.[0]?.url || data.imageUrl,
        description: data.description?.short || data.shortDescription,
        productUrl: window.location.href,
      };
    }

    // Recursively search in object properties
    for (const key in data) {
      if (key === 'product' || key === 'productData' || key === 'pageProduct') {
        const product = this._findProductInData(data[key], depth + 1);
        if (product) return product;
      }
    }

    // Search in props for Next.js
    if (data.props) {
      const product = this._findProductInData(data.props, depth + 1);
      if (product) return product;
    }

    if (data.pageProps) {
      const product = this._findProductInData(data.pageProps, depth + 1);
      if (product) return product;
    }

    return null;
  },

  /**
   * Detect store currency
   */
  _detectCurrency() {
    // Try from meta tags
    const currencyMeta = document.querySelector('meta[itemprop="priceCurrency"], meta[property="og:price:currency"]');
    if (currencyMeta) {
      return currencyMeta.content;
    }

    // Try from page data
    if (window.pageContext && window.pageContext.currency) {
      return window.pageContext.currency;
    }

    // Check for currency symbols in prices
    const priceEl = document.querySelector('.price, .product-price, [data-price]');
    if (priceEl) {
      const text = priceEl.textContent;
      if (text.includes('$')) return 'USD';
      if (text.includes('£')) return 'GBP';
      if (text.includes('€')) return 'EUR';
      if (text.includes('¥')) return 'JPY';
    }

    return 'USD';
  },
};
