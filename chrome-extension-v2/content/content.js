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

          // Image handling - handle string, array, or ImageObject
          if (productData.image) {
            let img = Array.isArray(productData.image) ? productData.image[0] : productData.image;
            // Handle ImageObject type
            if (typeof img === 'object' && img !== null) {
              img = img.url || img.contentUrl || img['@id'] || null;
            }
            if (typeof img === 'string') {
              product.imageUrl = img;
            }
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

    // Helper to extract image URL from various attributes
    function getImageSrc(img) {
      if (!img) return null;
      const src = img.src ||
                  img.currentSrc ||
                  img.getAttribute('data-src') ||
                  img.getAttribute('data-lazy-src') ||
                  img.getAttribute('data-original') ||
                  img.getAttribute('data-zoom-image') ||
                  img.getAttribute('data-image') ||
                  img.getAttribute('data-srcset')?.split(',')[0]?.trim()?.split(' ')[0];
      // Also check srcset
      if (!src && img.srcset) {
        const firstSrc = img.srcset.split(',')[0]?.trim()?.split(' ')[0];
        if (firstSrc) return firstSrc;
      }
      return (src && !src.startsWith('data:')) ? src : null;
    }

    // Fallback: image from Open Graph or other meta tags
    if (!product.imageUrl) {
      product.imageUrl = document.querySelector('meta[property="og:image"]')?.content ||
                         document.querySelector('meta[property="og:image:url"]')?.content ||
                         document.querySelector('meta[name="twitter:image"]')?.content ||
                         document.querySelector('link[rel="image_src"]')?.href;
    }

    // Try various product image selectors
    if (!product.imageUrl) {
      const imgSelectors = [
        // Common e-commerce patterns
        '.product-image img',
        '.product-media img',
        '.product-gallery img',
        '.product-photo img',
        '.product-picture img',
        '[class*="gallery"] img',
        '[class*="product"] img[class*="main"]',
        '[class*="product"] img[class*="primary"]',
        '[class*="product"] img:first-of-type',
        '.pdp-image img',
        '.product-detail img',
        'img[itemprop="image"]',
        '[data-zoom-image]',
        '.fotorama img',
        // Picture elements
        'picture.product-image source',
        'picture[class*="product"] source',
        'picture source[type="image/webp"]',
        'picture source',
        // Specific platforms
        '.woocommerce-product-gallery img',
        '.shopify-section img',
        '#product-image img',
        '#main-image img',
        '.main-image img',
        // French e-commerce
        '.product-img img',
        '.visuel-produit img',
        '.image-produit img',
        '[class*="slider"] img:first-of-type'
      ];

      for (const selector of imgSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          // Handle both img and source elements
          const src = el.tagName === 'SOURCE'
            ? (el.srcset?.split(',')[0]?.trim()?.split(' ')[0] || el.src)
            : getImageSrc(el);
          if (src) {
            product.imageUrl = src;
            break;
          }
        }
      }
    }

    // Try to find image in picture element
    if (!product.imageUrl) {
      const pictures = document.querySelectorAll('picture');
      for (const picture of pictures) {
        const parent = picture.closest('[class*="product"], [class*="gallery"], main, article');
        if (parent) {
          const source = picture.querySelector('source');
          const img = picture.querySelector('img');
          const src = source?.srcset?.split(',')[0]?.trim()?.split(' ')[0] || getImageSrc(img);
          if (src) {
            product.imageUrl = src;
            break;
          }
        }
      }
    }

    // Check for Demandware/Salesforce Commerce Cloud product images
    if (!product.imageUrl) {
      const images = Array.from(document.querySelectorAll('img'));
      for (const img of images) {
        const src = getImageSrc(img);
        if (src && (src.includes('master-catalog') || src.includes('/images/DIS/') || src.includes('/images/hi-res/'))) {
          // Prefer larger versions (1500 over 220)
          if (src.includes('1500') || !src.includes('220')) {
            product.imageUrl = src;
            break;
          }
        }
      }
    }

    // Last resort: find largest visible image on page (excluding nav/menu images)
    if (!product.imageUrl) {
      const images = Array.from(document.querySelectorAll('img'));
      let bestImg = null;
      let bestScore = 0;

      for (const img of images) {
        const src = getImageSrc(img);
        if (!src) continue;

        // Skip common non-product images
        const skipPatterns = ['logo', 'icon', 'sprite', 'arrow', 'button', 'menu', 'megamenu', 'push_', 'footer', 'cookie'];
        if (skipPatterns.some(p => src.toLowerCase().includes(p))) continue;

        // Calculate score based on size and position
        const rect = img.getBoundingClientRect();
        const area = (img.naturalWidth || img.width || rect.width) * (img.naturalHeight || img.height || rect.height);
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        const isInMainContent = img.closest('main, article, [class*="product"], [class*="content"], [class*="pdp"], [class*="detail"]');

        let score = area;
        if (isVisible) score *= 2;
        if (isInMainContent) score *= 3;

        // Boost score for URLs that look like product images
        if (src.includes('product') || src.includes('catalog') || src.includes('/images/')) score *= 1.5;

        if (score > bestScore && area > 5000) {
          bestScore = score;
          bestImg = src;
        }
      }
      if (bestImg) {
        product.imageUrl = bestImg;
      }
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
