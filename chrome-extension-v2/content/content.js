/**
 * ShopSmart Travel Content Script
 * Detects product/cart pages and provides scraping functionality
 */

(function() {
  'use strict';

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('ShopSmart received message:', request.action);

    try {
      if (request.action === 'getPageType') {
        const result = {
          isProduct: isProductPage(),
          isCart: isCartPage()
        };
        console.log('Page type:', result);
        sendResponse(result);
      } else if (request.action === 'scrapeProduct') {
        const product = scrapeProduct();
        console.log('Scraped product:', product);
        sendResponse({ product });
      } else if (request.action === 'scrapeCart') {
        const items = scrapeCart();
        console.log('Scraped cart:', items);
        sendResponse({ items });
      }
    } catch (error) {
      console.error('ShopSmart error:', error);
      sendResponse({ error: error.message });
    }
    return true;
  });

  function isProductPage() {
    const hasAddToCart = !!document.querySelector('[class*="add-to-cart"], [id*="add-to-cart"], button[name="add"], [data-action="add-to-cart"]');
    const hasProductSchema = !!document.querySelector('script[type="application/ld+json"]');
    const hasProductMeta = !!document.querySelector('meta[property="og:type"][content="product"], meta[property="product:price:amount"]');
    const hasPrice = !!document.querySelector('[class*="price"], [itemprop="price"]');

    return hasAddToCart || (hasProductSchema && hasPrice) || hasProductMeta;
  }

  function isCartPage() {
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    return url.includes('/cart') ||
           url.includes('/basket') ||
           url.includes('/bag') ||
           pathname.includes('cart') ||
           pathname.includes('checkout') ||
           !!document.querySelector('[class*="cart-item"], [class*="basket-item"], [data-cart-item]');
  }

  function scrapeProduct() {
    let product = {};
    let organizationName = null;

    // Parse ALL JSON-LD scripts
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (const jsonLd of jsonLdScripts) {
      try {
        const data = JSON.parse(jsonLd.textContent);

        // Look for Organization (brand fallback)
        if (data['@type'] === 'Organization' && data.name) {
          organizationName = data.name;
        }

        // Find product data
        let productData = null;
        if (data['@type'] === 'Product') {
          productData = data;
        } else if (Array.isArray(data['@graph'])) {
          productData = data['@graph'].find(item => item['@type'] === 'Product');
          // Also check for Organization in graph
          const org = data['@graph'].find(item => item['@type'] === 'Organization');
          if (org?.name) organizationName = org.name;
        } else if (Array.isArray(data)) {
          productData = data.find(item => item['@type'] === 'Product');
        }

        if (productData) {
          // Only set if we have a value
          if (productData.name) product.name = productData.name;
          if (productData.brand?.name) product.brand = productData.brand.name;
          else if (typeof productData.brand === 'string') product.brand = productData.brand;
          if (productData.description) product.description = productData.description;
          if (productData.sku) product.sku = productData.sku;

          // Image handling
          if (productData.image) {
            product.imageUrl = Array.isArray(productData.image) ? productData.image[0] : productData.image;
          }

          // Price from offers
          if (productData.offers) {
            const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
            if (offer.price) product.price = parseFloat(offer.price);
            if (offer.priceCurrency) product.currency = offer.priceCurrency;
          }

          // Price at root level (Magento sites)
          if (!product.price && productData.price) {
            product.price = parseFloat(productData.price);
          }
          if (!product.currency && productData.priceCurrency) {
            product.currency = productData.priceCurrency;
          }
        }
      } catch (e) {
        console.debug('JSON-LD parse error:', e);
      }
    }

    // Fallback: use h1 for product name
    if (!product.name) {
      const h1 = document.querySelector('h1');
      if (h1) {
        product.name = h1.textContent.trim();
      }
    }

    // Fallback: Open Graph title (less preferred as it often includes site name)
    if (!product.name) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        product.name = ogTitle.content;
      }
    }

    // Fallback: use Organization name as brand
    if (!product.brand && organizationName) {
      product.brand = organizationName;
    }

    // Fallback: brand from meta tags or DOM
    if (!product.brand) {
      product.brand = document.querySelector('meta[property="product:brand"]')?.content ||
                      document.querySelector('meta[property="og:site_name"]')?.content ||
                      document.querySelector('[itemprop="brand"]')?.textContent?.trim() ||
                      document.querySelector('.brand, [class*="brand-name"]')?.textContent?.trim();
    }

    // Fallback: image from Open Graph or main product image
    if (!product.imageUrl) {
      product.imageUrl = document.querySelector('meta[property="og:image"]')?.content ||
                         document.querySelector('.product-image img, .product-media img, [class*="gallery"] img, .fotorama img')?.src ||
                         document.querySelector('img[itemprop="image"]')?.src;
    }

    // Fallback: price from DOM
    if (!product.price) {
      const priceEl = document.querySelector('[itemprop="price"]') ||
                      document.querySelector('meta[property="product:price:amount"]') ||
                      document.querySelector('[data-price-amount]') ||
                      document.querySelector('.price-wrapper .price, .product-price .price, [class*="price"]:not([class*="was"]):not([class*="old"]):not([class*="original"])');

      if (priceEl) {
        const priceText = priceEl.content || priceEl.getAttribute('data-price-amount') || priceEl.textContent;
        const priceMatch = priceText?.match(/[\d,.]+/);
        if (priceMatch) {
          // Handle European format (comma as decimal)
          let priceStr = priceMatch[0];
          if (priceStr.includes(',') && !priceStr.includes('.')) {
            priceStr = priceStr.replace(',', '.');
          } else {
            priceStr = priceStr.replace(',', '');
          }
          product.price = parseFloat(priceStr);
        }
      }
    }

    // Currency fallback
    if (!product.currency) {
      product.currency = document.querySelector('meta[property="product:price:currency"]')?.content ||
                         document.querySelector('[data-price-currency]')?.getAttribute('data-price-currency') ||
                         'USD';
    }

    product.productUrl = window.location.href;

    console.log('ShopSmart scraped product:', product);
    return product;
  }

  function scrapeCart() {
    const items = [];

    // Shopify cart
    if (window.Shopify) {
      return scrapeShopifyCart();
    }

    // Generic cart scraping
    const cartItems = document.querySelectorAll('[class*="cart-item"], [class*="basket-item"], [class*="line-item"], [data-cart-item]');

    cartItems.forEach((item, index) => {
      const nameEl = item.querySelector('[class*="name"], [class*="title"], h2, h3, a');
      const priceEl = item.querySelector('[class*="price"]');
      const imageEl = item.querySelector('img');
      const qtyEl = item.querySelector('input[type="number"], [class*="quantity"]');

      if (nameEl) {
        const priceText = priceEl?.textContent || '';
        const priceMatch = priceText.match(/[\d,.]+/);

        items.push({
          name: nameEl.textContent?.trim(),
          price: priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : null,
          currency: 'USD',
          imageUrl: imageEl?.src,
          quantity: parseInt(qtyEl?.value || qtyEl?.textContent) || 1,
          productUrl: nameEl.href || window.location.href
        });
      }
    });

    return items;
  }

  async function scrapeShopifyCart() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();

      return cart.items.map(item => ({
        name: item.title,
        price: item.price / 100,
        currency: cart.currency || 'USD',
        imageUrl: item.image,
        quantity: item.quantity,
        brand: item.vendor,
        productUrl: window.location.origin + item.url
      }));
    } catch (e) {
      console.error('Shopify cart scrape error:', e);
      return [];
    }
  }

  console.log('ShopSmart content script loaded');
})();
