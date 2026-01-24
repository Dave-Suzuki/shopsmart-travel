/**
 * Generic product scraper
 * Uses JSON-LD, Open Graph, and meta tags to extract product data
 */

window.ShopSmartScrapers = window.ShopSmartScrapers || {};

window.ShopSmartScrapers.generic = {
  name: 'generic',

  /**
   * Check if this is likely a product page
   */
  isProductPage() {
    // Check for JSON-LD Product schema
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (this._findProductInJsonLd(data)) {
          return true;
        }
      } catch (e) {
        // Continue checking other scripts
      }
    }

    // Check for Open Graph product type
    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType && ogType.content === 'product') {
      return true;
    }

    // Check for common product page indicators
    const hasAddToCart = document.querySelector('[class*="add-to-cart"], [id*="add-to-cart"], [data-action*="add-to-cart"], button[name*="add"]');
    const hasPrice = document.querySelector('[class*="price"], [itemprop="price"], [data-price]');

    return hasAddToCart && hasPrice;
  },

  /**
   * Check if this is a cart page
   */
  isCartPage() {
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    // Common cart URL patterns
    if (pathname.includes('/cart') || pathname.includes('/basket') || pathname.includes('/bag')) {
      return true;
    }

    // Check for cart page indicators in content
    const cartHeading = document.querySelector('h1, h2');
    if (cartHeading && /shopping (cart|bag|basket)|your (cart|bag|basket)|cart summary/i.test(cartHeading.textContent)) {
      return true;
    }

    return false;
  },

  /**
   * Scrape product data from the current page
   */
  scrapeProduct() {
    let product = {
      name: null,
      price: null,
      currency: null,
      brand: null,
      imageUrl: null,
      description: null,
      productUrl: window.location.href,
    };

    // Try JSON-LD first (most reliable)
    product = this._scrapeJsonLd(product);

    // Fill in missing data from Open Graph
    product = this._scrapeOpenGraph(product);

    // Fill in missing data from meta tags
    product = this._scrapeMetaTags(product);

    // Fill in missing data from page content
    product = this._scrapePageContent(product);

    // Clean up and validate
    product = this._cleanProduct(product);

    return product;
  },

  /**
   * Find Product object in JSON-LD data (handles nested structures)
   */
  _findProductInJsonLd(data) {
    if (!data) return null;

    if (Array.isArray(data)) {
      for (const item of data) {
        const found = this._findProductInJsonLd(item);
        if (found) return found;
      }
      return null;
    }

    if (data['@type'] === 'Product') {
      return data;
    }

    if (data['@graph']) {
      return this._findProductInJsonLd(data['@graph']);
    }

    return null;
  },

  /**
   * Scrape from JSON-LD structured data
   */
  _scrapeJsonLd(product) {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        const productData = this._findProductInJsonLd(data);

        if (productData) {
          product.name = product.name || productData.name;
          product.description = product.description || productData.description;
          product.brand = product.brand || (productData.brand?.name || productData.brand);

          // Handle image (can be string or array)
          if (!product.imageUrl && productData.image) {
            product.imageUrl = Array.isArray(productData.image)
              ? productData.image[0]
              : (typeof productData.image === 'object' ? productData.image.url : productData.image);
          }

          // Handle offers for price
          const offers = productData.offers;
          if (offers) {
            const offer = Array.isArray(offers) ? offers[0] : offers;
            product.price = product.price || parseFloat(offer.price);
            product.currency = product.currency || offer.priceCurrency;
          }
        }
      } catch (e) {
        console.debug('ShopSmart: Error parsing JSON-LD', e);
      }
    }

    return product;
  },

  /**
   * Scrape from Open Graph meta tags
   */
  _scrapeOpenGraph(product) {
    const getMeta = (property) => {
      const el = document.querySelector(`meta[property="${property}"]`);
      return el ? el.content : null;
    };

    product.name = product.name || getMeta('og:title');
    product.description = product.description || getMeta('og:description');
    product.imageUrl = product.imageUrl || getMeta('og:image');

    // Some sites use product-specific OG tags
    const ogPrice = getMeta('product:price:amount') || getMeta('og:price:amount');
    if (ogPrice && !product.price) {
      product.price = parseFloat(ogPrice);
    }

    const ogCurrency = getMeta('product:price:currency') || getMeta('og:price:currency');
    product.currency = product.currency || ogCurrency;

    product.brand = product.brand || getMeta('product:brand');

    return product;
  },

  /**
   * Scrape from standard meta tags
   */
  _scrapeMetaTags(product) {
    const getMeta = (name) => {
      const el = document.querySelector(`meta[name="${name}"]`);
      return el ? el.content : null;
    };

    product.name = product.name || getMeta('title') || document.title;
    product.description = product.description || getMeta('description');

    return product;
  },

  /**
   * Scrape from page content as fallback
   */
  _scrapePageContent(product) {
    // Try to find price from common selectors
    if (!product.price) {
      const priceSelectors = [
        '[itemprop="price"]',
        '[data-price]',
        '.price .amount',
        '.product-price',
        '.price-current',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price .a-offscreen',
      ];

      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const priceText = el.getAttribute('content') || el.textContent;
          const priceMatch = priceText.match(/[\d,.]+/);
          if (priceMatch) {
            product.price = parseFloat(priceMatch[0].replace(/,/g, ''));
            break;
          }
        }
      }
    }

    // Try to detect currency from price display
    if (!product.currency) {
      const currencyMap = {
        '$': 'USD',
        '£': 'GBP',
        '€': 'EUR',
        '¥': 'JPY',
        '₹': 'INR',
        'A$': 'AUD',
        'C$': 'CAD',
      };

      const priceElements = document.querySelectorAll('[class*="price"], .a-price');
      for (const el of priceElements) {
        const text = el.textContent;
        for (const [symbol, code] of Object.entries(currencyMap)) {
          if (text.includes(symbol)) {
            product.currency = code;
            break;
          }
        }
        if (product.currency) break;
      }
    }

    // Try to find brand from common selectors
    if (!product.brand) {
      const brandSelectors = [
        '[itemprop="brand"]',
        '.brand',
        '.product-brand',
        'a[href*="/brand/"]',
        '#bylineInfo',
      ];

      for (const selector of brandSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          product.brand = el.textContent.trim();
          break;
        }
      }
    }

    // Try to find main product image
    if (!product.imageUrl) {
      const imageSelectors = [
        '[itemprop="image"]',
        '.product-image img',
        '#main-image',
        '#landingImage',
        '.gallery-image img',
      ];

      for (const selector of imageSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          product.imageUrl = el.src || el.getAttribute('data-src');
          if (product.imageUrl) break;
        }
      }
    }

    return product;
  },

  /**
   * Clean up and validate product data
   */
  _cleanProduct(product) {
    // Truncate name if too long
    if (product.name && product.name.length > 200) {
      product.name = product.name.substring(0, 197) + '...';
    }

    // Remove site name from title
    if (product.name) {
      product.name = product.name.replace(/\s*[-|]\s*[^-|]+$/, '').trim();
    }

    // Truncate description
    if (product.description && product.description.length > 500) {
      product.description = product.description.substring(0, 497) + '...';
    }

    // Clean up brand
    if (product.brand) {
      product.brand = product.brand.replace(/^(Brand:|by\s+)/i, '').trim();
      if (product.brand.length > 100) {
        product.brand = product.brand.substring(0, 100);
      }
    }

    // Ensure price is a number
    if (product.price && typeof product.price === 'string') {
      product.price = parseFloat(product.price.replace(/[^0-9.]/g, ''));
    }

    // Default currency
    if (!product.currency) {
      product.currency = 'USD';
    }

    // Validate image URL
    if (product.imageUrl) {
      try {
        new URL(product.imageUrl);
      } catch {
        product.imageUrl = null;
      }
    }

    return product;
  },
};
