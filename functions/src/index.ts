import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import * as cheerio from 'cheerio';
import { enforceRateLimit, type RateLimitRule } from './rateLimit';
import {
  BLOCKED_DESTINATION,
  BlockedDestinationError,
  UNSUPPORTED_CONTENT_TYPE,
  URL_NOT_ALLOWED,
  UrlNotAllowedError,
  assertUrlAllowed,
  createHtmlFetcher,
  hasErrorCode,
} from './urlSafety';

initializeApp();

export { inviteCollaborator } from './invite';
export { refreshExchangeRates } from './exchangeRates';

export interface ProductInfo {
  name?: string;
  image?: string;
  description?: string;
  price?: number;
  currency?: string;
  brand?: string;
  error?: string;
}

/**
 * Parse price from text, handling various international formats:
 * - US/UK: 3,750.00 or 3,750 (comma = thousands, dot = decimal)
 * - European: 3.750,00 or 3.750 or 3 750 (dot/space = thousands, comma = decimal)
 * - French: 3 750,00 (space = thousands, comma = decimal)
 */
function parsePrice(priceText: string): number | null {
  if (!priceText) return null;

  // Remove currency symbols and trim
  let cleaned = priceText.replace(/[€$£¥₹₽₩₪฿]/g, '').trim();

  // Remove common text like "EUR", "USD", etc.
  cleaned = cleaned.replace(/\b(EUR|USD|GBP|JPY|EURO|EUROS)\b/gi, '').trim();

  // Extract just the number part (digits, dots, commas, spaces)
  const numberMatch = cleaned.match(/[\d\s.,]+/);
  if (!numberMatch) return null;

  let numberStr = numberMatch[0].trim();

  // Remove spaces (French thousands separator)
  numberStr = numberStr.replace(/\s/g, '');

  // Determine format based on separators present
  const lastComma = numberStr.lastIndexOf(',');
  const lastDot = numberStr.lastIndexOf('.');
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;

  let result: number;

  if (hasComma && hasDot) {
    // Both separators present - the LAST one is the decimal separator
    if (lastComma > lastDot) {
      // Format: 3.750,00 (European) - comma is decimal
      result = parseFloat(numberStr.replace(/\./g, '').replace(',', '.'));
    } else {
      // Format: 3,750.00 (US/UK) - dot is decimal
      result = parseFloat(numberStr.replace(/,/g, ''));
    }
  } else if (hasComma && !hasDot) {
    // Only comma present - check if it's decimal or thousands
    const afterComma = numberStr.substring(lastComma + 1);
    if (afterComma.length <= 2) {
      // Comma is decimal separator (European: 3750,00 or 3750,5)
      result = parseFloat(numberStr.replace(',', '.'));
    } else {
      // Comma is thousands separator (US: 3,750 means 3750)
      result = parseFloat(numberStr.replace(/,/g, ''));
    }
  } else if (hasDot && !hasComma) {
    // Only dot present - check if it's decimal or thousands
    const afterDot = numberStr.substring(lastDot + 1);
    if (afterDot.length === 3) {
      // Dot is thousands separator (European: 3.750 means 3750)
      result = parseFloat(numberStr.replace(/\./g, ''));
    } else {
      // Dot is decimal separator (US: 3750.00)
      result = parseFloat(numberStr);
    }
  } else {
    // No separators - just digits
    result = parseFloat(numberStr);
  }

  return isNaN(result) || result <= 0 ? null : result;
}

const MAX_URL_LENGTH = 2048;

const SCRAPE_RATE_LIMIT: RateLimitRule = {
  key: 'scrapeProductInfo',
  max: 30,
  windowMs: 60 * 60 * 1000,
  message: 'Too many lookups. Try again in a few minutes.',
};

const PRIVATE_ADDRESS_MESSAGE =
  "This link points to a private or local network address, so it can't be fetched.";

// Realistic browser headers; many shops serve bots a stripped-down page otherwise.
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

// Public addresses only (checked per connection and per redirect), max 3 redirects,
// 8 s deadline, 2 MB body, HTML responses only. See urlSafety.ts.
const fetchProductPage = createHtmlFetcher();

const CONNECT_ERROR_CODES = ['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH'];
const TIMEOUT_ERROR_CODES = ['ETIMEDOUT', 'ECONNABORTED', 'ERR_CANCELED'];

/** Maps a fetch/parse failure to the user-facing `{ error }` reply. */
function describeScrapeFailure(error: unknown, uid: string, url: string): ProductInfo {
  if (hasErrorCode(error, BLOCKED_DESTINATION)) {
    functions.logger.warn('Blocked request to a non-public address', {
      uid,
      url,
      reason: error instanceof Error ? error.message : String(error),
    });
    return { error: PRIVATE_ADDRESS_MESSAGE };
  }

  functions.logger.error('Error scraping URL:', error);

  if (hasErrorCode(error, URL_NOT_ALLOWED)) {
    return {
      error: "The website redirected to a link that can't be fetched. Please enter details manually.",
    };
  }

  if (hasErrorCode(error, UNSUPPORTED_CONTENT_TYPE)) {
    return {
      error: "That link doesn't point to a web page. Please use the product page URL.",
    };
  }

  if (hasErrorCode(error, 'ERR_FR_TOO_MANY_REDIRECTS')) {
    return {
      error: 'The website redirected too many times. Please enter details manually.',
    };
  }

  if (CONNECT_ERROR_CODES.some((code) => hasErrorCode(error, code))) {
    return {
      error: 'Could not connect to the website. Please check the URL.',
    };
  }

  if (TIMEOUT_ERROR_CODES.some((code) => hasErrorCode(error, code))) {
    return {
      error: 'Request timed out. The website took too long to respond.',
    };
  }

  if (error instanceof Error && error.message.includes('maxContentLength')) {
    return {
      error: 'That page is too large to read automatically. Please enter details manually.',
    };
  }

  const status = (error as { response?: { status?: number } } | null)?.response?.status;

  if (status === 404) {
    return {
      error: 'Page not found (404). Please check the URL.',
    };
  }

  if (status === 403 || status === 401) {
    return {
      error: 'Access denied. The website may require authentication.',
    };
  }

  return {
    error: 'Failed to fetch product information. Please enter details manually.',
  };
}

/**
 * Cloud Function to scrape product information from a URL
 * Extracts Open Graph metadata and JSON-LD structured data
 */
export const scrapeProductInfo = functions.https.onCall(async (request): Promise<ProductInfo> => {
  // Validate authentication
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to scrape URLs'
    );
  }

  const url = (request.data as { url?: unknown } | null | undefined)?.url;

  // Validate URL
  if (!url || typeof url !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'URL is required and must be a string'
    );
  }

  if (url.length > MAX_URL_LENGTH) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'URL is too long'
    );
  }

  // Scheme, port, credential and IP-literal checks (the fetcher re-checks every hop)
  try {
    assertUrlAllowed(url);
  } catch (error) {
    if (error instanceof UrlNotAllowedError) {
      throw new functions.https.HttpsError('invalid-argument', error.message);
    }
    if (error instanceof BlockedDestinationError) {
      throw new functions.https.HttpsError('invalid-argument', PRIVATE_ADDRESS_MESSAGE);
    }
    throw error;
  }

  // Max 30 lookups per rolling hour per user
  await enforceRateLimit(request.auth.uid, SCRAPE_RATE_LIMIT);

  try {
    const html = await fetchProductPage(url, BROWSER_HEADERS);

    const $ = cheerio.load(html);
    const result: ProductInfo = {};

    // Extract Open Graph metadata
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogPrice = $('meta[property="og:price:amount"]').attr('content') ||
                   $('meta[property="product:price:amount"]').attr('content');
    const ogCurrency = $('meta[property="og:price:currency"]').attr('content') ||
                      $('meta[property="product:price:currency"]').attr('content');

    // Extract Twitter Card metadata as fallback
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    const twitterDescription = $('meta[name="twitter:description"]').attr('content');

    // Extract standard meta tags as fallback
    const metaDescription = $('meta[name="description"]').attr('content');
    const pageTitle = $('title').text();

    // Set name (prefer Open Graph, fallback to Twitter, then page title)
    result.name = ogTitle || twitterTitle || pageTitle;

    // Set image (prefer Open Graph, fallback to Twitter)
    let imageUrl = ogImage || twitterImage;

    // Try to find main product image if OG tags don't have it
    if (!imageUrl) {
      // Common product image selectors
      imageUrl = $('img[data-old-hires]').attr('data-old-hires') || // Amazon
                 $('img.main-image').first().attr('src') ||
                 $('img#mainImage').attr('src') ||
                 $('img#landingImage').attr('src') ||
                 $('.gallery-image').first().attr('src') ||
                 $('img[itemprop="image"]').attr('src') ||
                 $('img.product-image').first().attr('src') ||
                 $('img').filter(function() {
                   const src = $(this).attr('src') || '';
                   return src.includes('product') || src.includes('item');
                 }).first().attr('src');
    }

    // Make relative URLs absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      imageUrl = new URL(imageUrl, baseUrl.origin).href;
    }
    result.image = imageUrl;

    // Set description
    result.description = ogDescription || twitterDescription || metaDescription;

    // Set price from OG tags if available
    if (ogPrice) {
      result.price = parsePrice(ogPrice) ?? undefined;
    }
    if (ogCurrency) {
      result.currency = ogCurrency;
    }

    // Try to extract price from JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');

    jsonLdScripts.each((_, element): boolean | void => {
      try {
        const jsonLdText = $(element).html();
        if (jsonLdText) {
          const jsonLd = JSON.parse(jsonLdText);

          // Handle single object or array of objects
          const objects = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

          for (const obj of objects) {
            // Look for Product schema with offers
            if (obj['@type'] === 'Product' && obj.offers) {
              const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;

              if (offers.price) {
                result.price = parsePrice(String(offers.price)) ?? undefined;
              }

              if (offers.priceCurrency) {
                result.currency = offers.priceCurrency;
              }

              // If we found price info, break
              if (result.price && result.currency) {
                return false; // Break out of .each()
              }
            }

            // Look for Product schema with priceSpecification (M&S and others)
            if (obj['@type'] === 'Product' && obj.priceSpecification) {
              const priceSpec = obj.priceSpecification;

              if (priceSpec.price) {
                result.price = parsePrice(String(priceSpec.price)) ?? undefined;
              }

              if (priceSpec.priceCurrency) {
                result.currency = priceSpec.priceCurrency;
              }

              // If we found price info, break
              if (result.price && result.currency) {
                return false; // Break out of .each()
              }
            }
          }
        }
      } catch (e) {
        // Ignore JSON parsing errors and continue
        functions.logger.warn('Failed to parse JSON-LD:', e);
      }
    });

    // Try to extract price from schema.org meta tags if not found
    if (!result.price) {
      const schemaPrice = $('meta[itemprop="price"]').attr('content');
      const schemaCurrency = $('meta[itemprop="priceCurrency"]').attr('content');

      if (schemaPrice) {
        result.price = parsePrice(schemaPrice) ?? undefined;
      }
      if (schemaCurrency) {
        result.currency = schemaCurrency;
      }
    }

    // Try to extract price from JavaScript config objects (Pierre Hermé, Magento sites, etc.)
    if (!result.price) {
      const allScripts = $('script').not('[type="application/ld+json"]');

      allScripts.each((_, element): boolean | void => {
        const scriptContent = $(element).html() || '';

        // Look for common price patterns in JavaScript configs
        // Patterns: "price":39, "final_price":39, "regular_price":39, price: 39.00
        const pricePatterns = [
          /"(?:final_price|regular_price|price)"\s*:\s*(\d+(?:\.\d+)?)/,
          /(?:final_price|regular_price|price)\s*:\s*(\d+(?:\.\d+)?)/,
          /ecomm_totalvalue\s*=\s*(\d+(?:\.\d+)?)/,
        ];

        for (const pattern of pricePatterns) {
          const match = scriptContent.match(pattern);
          if (match && match[1]) {
            const parsedPrice = parsePrice(match[1]);
            if (parsedPrice) {
              result.price = parsedPrice;

              // Try to find currency in the same script
              if (!result.currency) {
                const currencyMatch = scriptContent.match(/"(?:currency|priceCurrency)"\s*:\s*"([A-Z]{3})"/i);
                if (currencyMatch && currencyMatch[1]) {
                  result.currency = currencyMatch[1].toUpperCase();
                }
              }

              // If we found price, break
              if (result.price) {
                return false; // Break out of .each()
              }
            }
          }
        }
      });
    }

    // Try to extract price from Next.js __NEXT_DATA__ (Harrods, modern sites)
    if (!result.price) {
      const nextDataScript = $('script#__NEXT_DATA__');
      if (nextDataScript.length > 0) {
        try {
          const nextDataText = nextDataScript.html();
          if (nextDataText) {
            const nextData = JSON.parse(nextDataText);

            // Common paths in Next.js data
            const possiblePaths = [
              nextData?.props?.pageProps?.product,
              nextData?.props?.pageProps?.initialState?.product,
              nextData?.props?.initialProps?.product,
              nextData?.props?.product,
            ];

            for (const productData of possiblePaths) {
              if (productData && productData.price) {
                const price = typeof productData.price === 'object'
                  ? (productData.price.value || productData.price.amount)
                  : productData.price;

                if (price) {
                  result.price = parsePrice(price.toString()) ?? undefined;

                  if (productData.currency || productData.price?.currency) {
                    result.currency = productData.currency || productData.price.currency;
                  }

                  if (result.price) break;
                }
              }
            }
          }
        } catch (e) {
          functions.logger.warn('Failed to parse Next.js data:', e);
        }
      }
    }

    // Try to extract from window.__INITIAL_STATE__ or similar React patterns
    if (!result.price) {
      const allScripts = $('script').not('[type="application/ld+json"]');

      allScripts.each((_, element): boolean | void => {
        const scriptContent = $(element).html() || '';

        // Look for window.__INITIAL_STATE__, window.__DATA__, etc.
        const statePatterns = [
          /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/,
          /window\.__DATA__\s*=\s*({[\s\S]+?});/,
          /window\.initialState\s*=\s*({[\s\S]+?});/,
        ];

        for (const pattern of statePatterns) {
          const match = scriptContent.match(pattern);
          if (match && match[1]) {
            try {
              const stateData = JSON.parse(match[1]);

              // Look for product/price in common paths
              const price = stateData?.product?.price ||
                           stateData?.productDetail?.price ||
                           stateData?.page?.product?.price;

              const currency = stateData?.product?.currency ||
                              stateData?.productDetail?.currency ||
                              stateData?.page?.product?.currency;

              if (price) {
                result.price = parsePrice(price.toString()) ?? undefined;
                if (currency) result.currency = currency;

                if (result.price) return false; // Break
              }
            } catch {
              // Invalid JSON, continue
            }
          }
        }
      });
    }

    // Try to extract price from common HTML elements as last resort
    if (!result.price) {
      // Common price selectors on e-commerce sites
      const priceSelectors = [
        '.price',
        '#price',
        '.product-price',
        '[data-price]',
        '[data-product-price]',
        '[data-price-amount]',
        '[data-price-value]',
        '.sale-price',
        '.current-price',
        '.final-price',
        '.product-price-value',
        'span[itemprop="price"]',
        '.price-sales',
        '.price-standard',
        '.value[itemprop="price"]',
        '.a-price-whole', // Amazon
        '.price-current', // Newegg
        '.notranslate', // eBay
        '.product__price', // Shopify patterns
        '.price__current',
        '.price-item--regular',
        // Department store specific
        '.product-price__amount',
        '.productPrice',
        '.product-sales-price',
        '.js-product-price',
      ];

      for (const selector of priceSelectors) {
        let priceText = $(selector).first().text().trim();

        // Try multiple data attributes
        if (!priceText) {
          const element = $(selector).first();
          priceText = element.attr('data-price') ||
                     element.attr('data-product-price') ||
                     element.attr('data-price-amount') ||
                     element.attr('data-price-value') ||
                     element.attr('data-sale-price') ||
                     element.attr('content') ||
                     '';
        }

        if (priceText) {
          // Parse price using our international format handler
          const parsedPrice = parsePrice(priceText);
          if (parsedPrice) {
            result.price = parsedPrice;

            // Try to detect currency from the same text
            if (!result.currency) {
              if (priceText.includes('$') || priceText.toUpperCase().includes('USD')) {
                result.currency = 'USD';
              } else if (priceText.includes('€') || priceText.toUpperCase().includes('EUR')) {
                result.currency = 'EUR';
              } else if (priceText.includes('£') || priceText.toUpperCase().includes('GBP')) {
                result.currency = 'GBP';
              } else if (priceText.includes('¥')) {
                result.currency = 'JPY';
              }
            }

            break;
          }
        }
      }
    }

    // Set default currency if we have price but no currency
    if (result.price && !result.currency) {
      // Try to guess from URL domain and path
      const urlObj = new URL(url);
      const urlPath = urlObj.pathname.toLowerCase();

      // Check URL path for locale hints (e.g., /en-fr/, /fr-fr/, /de-de/)
      if (urlPath.includes('/en-fr/') || urlPath.includes('/fr-fr/') || urlPath.includes('/fr/') ||
          urlPath.includes('/de-de/') || urlPath.includes('/de/') ||
          urlPath.includes('/it-it/') || urlPath.includes('/it/') ||
          urlPath.includes('/es-es/') || urlPath.includes('/es/')) {
        result.currency = 'EUR';
      } else if (urlPath.includes('/en-gb/') || urlPath.includes('/gb/')) {
        result.currency = 'GBP';
      } else if (urlObj.hostname.endsWith('.co.uk')) {
        result.currency = 'GBP';
      } else if (urlObj.hostname.endsWith('.eu') || urlObj.hostname.endsWith('.de') || urlObj.hostname.endsWith('.fr')) {
        result.currency = 'EUR';
      } else if (urlObj.hostname.endsWith('.jp')) {
        result.currency = 'JPY';
      } else {
        // Default to USD
        result.currency = 'USD';
      }
    }

    // Extract brand/store name
    // Try from JSON-LD structured data first
    jsonLdScripts.each((_, element): boolean | void => {
      try {
        const jsonLdText = $(element).html();
        if (jsonLdText) {
          const jsonLd = JSON.parse(jsonLdText);
          const objects = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

          for (const obj of objects) {
            // Look for Product schema with brand
            if (obj['@type'] === 'Product' && obj.brand) {
              const brand = typeof obj.brand === 'string'
                ? obj.brand
                : obj.brand.name;

              if (brand) {
                result.brand = brand;
                return false; // Break out of .each()
              }
            }
          }
        }
      } catch {
        // Ignore errors
      }
    });

    // Try from Open Graph and meta tags
    if (!result.brand) {
      result.brand = $('meta[property="og:brand"]').attr('content') ||
                     $('meta[property="product:brand"]').attr('content') ||
                     $('meta[name="brand"]').attr('content') ||
                     $('meta[itemprop="brand"]').attr('content') ||
                     $('[itemprop="brand"]').text().trim();
    }

    // Extract from URL as fallback
    if (!result.brand) {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');

      // Map of common domains to brand names
      const brandMap: Record<string, string> = {
        'amazon.com': 'Amazon',
        'amazon.co.uk': 'Amazon UK',
        'amazon.de': 'Amazon DE',
        'amazon.fr': 'Amazon FR',
        'ebay.com': 'eBay',
        'ebay.co.uk': 'eBay UK',
        'etsy.com': 'Etsy',
        'walmart.com': 'Walmart',
        'target.com': 'Target',
        'bestbuy.com': 'Best Buy',
        'nike.com': 'Nike',
        'adidas.com': 'Adidas',
        'zara.com': 'Zara',
        'hm.com': 'H&M',
        'uniqlo.com': 'Uniqlo',
        'asos.com': 'ASOS',
        'nordstrom.com': 'Nordstrom',
        'macys.com': "Macy's",
        'sephora.com': 'Sephora',
        'ulta.com': 'Ulta',
        'ikea.com': 'IKEA',
        'wayfair.com': 'Wayfair',
        'homedepot.com': 'Home Depot',
        'lowes.com': "Lowe's",
        'zappos.com': 'Zappos',
        'shopify.com': 'Shopify Store',
        'marksandspencer.com': 'M&S',
        'johnlewis.com': 'John Lewis',
        'harrods.com': 'Harrods',
        'selfridges.com': 'Selfridges',
        'debenhams.com': 'Debenhams',
        'next.co.uk': 'Next',
        'argos.co.uk': 'Argos',
        'tesco.com': 'Tesco',
        'sainsburys.co.uk': "Sainsbury's",
        'boots.com': 'Boots',
        'superdrug.com': 'Superdrug',
        'primark.com': 'Primark',
        'tkmaxx.com': 'TK Maxx',
        'sportsdirect.com': 'Sports Direct',
        'jdsports.co.uk': 'JD Sports',
        'currys.co.uk': 'Currys',
        'pcworld.co.uk': 'PC World',
        'cartier.com': 'Cartier',
        'louisvuitton.com': 'Louis Vuitton',
        'hermes.com': 'Hermès',
        'chanel.com': 'Chanel',
        'dior.com': 'Dior',
        'gucci.com': 'Gucci',
        'prada.com': 'Prada',
        'burberry.com': 'Burberry',
        'rolex.com': 'Rolex',
      };

      result.brand = brandMap[hostname];

      // If not in map, extract from domain (e.g., "example.com" -> "Example")
      if (!result.brand) {
        const parts = hostname.split('.');
        const mainPart = parts.length > 1 ? parts[parts.length - 2] : parts[0];
        result.brand = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
      }
    }

    // Clean up the name - remove extra whitespace
    if (result.name) {
      result.name = result.name.trim().replace(/\s+/g, ' ');
    }

    // Clean up the description
    if (result.description) {
      result.description = result.description.trim().replace(/\s+/g, ' ');
      // Limit description length
      if (result.description.length > 500) {
        result.description = result.description.substring(0, 497) + '...';
      }
    }

    // Clean up the brand name
    if (result.brand) {
      result.brand = result.brand.trim().replace(/\s+/g, ' ');
      // Limit brand name length
      if (result.brand.length > 100) {
        result.brand = result.brand.substring(0, 100);
      }
    }

    functions.logger.info('Successfully scraped URL:', { url, result });

    return result;
  } catch (error) {
    // Return user-friendly error messages
    return describeScrapeFailure(error, request.auth.uid, url);
  }
});
