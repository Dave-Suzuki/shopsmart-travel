# ShopSmart Travel - Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the ShopSmart Travel application.

## Functions

### scrapeProductInfo

Scrapes product information from URLs using Open Graph metadata and JSON-LD structured data.

**Type:** HTTPS Callable Function
**Authentication:** Required

**Input:**
```typescript
{
  url: string; // The product URL to scrape
}
```

**Output:**
```typescript
{
  name?: string;        // Product name from og:title
  image?: string;       // Product image URL from og:image
  description?: string; // Product description from og:description
  price?: number;       // Product price from JSON-LD or meta tags
  currency?: string;    // Price currency code (e.g., USD, EUR)
  error?: string;       // Error message if scraping failed
}
```

**Features:**
- Extracts Open Graph metadata (og:title, og:image, og:description)
- Falls back to Twitter Card metadata
- Extracts price from JSON-LD structured data (schema.org Product)
- Extracts price from Open Graph and meta tags as fallback
- Handles relative image URLs by converting to absolute URLs
- Provides user-friendly error messages
- 10-second timeout for scraping requests
- Follows up to 5 redirects

**Supported Sites:**
Works with any website that implements:
- Open Graph metadata
- Twitter Card metadata
- JSON-LD structured data (schema.org Product)
- Standard meta tags

Tested with:
- Amazon
- eBay
- Etsy
- Most e-commerce platforms

## Setup

### Prerequisites

- Node.js 18 or higher
- Firebase CLI installed globally
- Firebase project configured

### Installation

1. Navigate to the functions directory:
```bash
cd functions
```

2. Install dependencies:
```bash
npm install
```

### Configuration

No additional configuration is required. The function uses the Firebase project's default settings.

## Development

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Test Locally

Run the function locally using Firebase Emulators:
```bash
npm run serve
```

This will start the Functions emulator. You can test the function using the Firebase Emulator UI or by calling it from your local app.

### Shell

Start an interactive shell for testing functions:
```bash
npm run shell
```

Example usage in shell:
```javascript
scrapeProductInfo({ url: 'https://example.com/product' })
```

## Deployment

### Deploy All Functions

```bash
npm run deploy
```

Or from the project root:
```bash
firebase deploy --only functions
```

### Deploy Specific Function

```bash
firebase deploy --only functions:scrapeProductInfo
```

## Monitoring

### View Logs

Real-time logs:
```bash
npm run logs
```

Or:
```bash
firebase functions:log
```

Filter by function:
```bash
firebase functions:log --only scrapeProductInfo
```

### Error Tracking

Errors are automatically logged to Firebase Console:
1. Go to Firebase Console
2. Navigate to Functions
3. Click on "Logs" tab
4. Filter by function name or error level

## Cost Considerations

This function makes external HTTP requests using axios. Be aware of:
- **Cloud Functions invocations**: Free tier includes 2M invocations/month
- **Outbound networking**: Free tier includes 5GB/month
- **CPU time**: Free tier includes 400,000 GB-seconds/month

For most use cases, this function should stay within the free tier limits.

## Security

- Function requires authentication (only logged-in users can call it)
- 10-second timeout prevents long-running requests
- Input validation for URL format
- Error handling prevents information leakage
- No credentials or API keys required

## Troubleshooting

### CORS Errors

The function should not have CORS issues since it's a Cloud Function making server-side requests. If you encounter issues, ensure you're calling it as an HTTPS Callable function, not as a regular HTTP endpoint.

### Timeout Errors

If scraping frequently times out:
1. Check the target website's response time
2. Consider increasing the timeout (currently 10 seconds)
3. Some websites may block automated requests - this is expected behavior

### No Data Returned

If the function returns empty data:
1. Check if the website has Open Graph tags (view page source)
2. Try adding more fallback extraction methods
3. Some websites may require JavaScript rendering (not supported)

### Website Blocking Requests

Some websites block automated requests. This is expected and there's no workaround without violating their terms of service. Users should enter data manually for such sites.

## Future Improvements

Potential enhancements:
- Support for more product schema types
- Image optimization/resizing
- Caching frequently scraped URLs
- Support for JavaScript-rendered pages using Puppeteer
- Multi-currency price extraction
- Product availability detection
- Review/rating extraction
