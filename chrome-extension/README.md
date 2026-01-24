# ShopSmart Travel Chrome Extension

A Chrome extension that allows users to add products to their ShopSmart Travel shopping list with one click, and import entire shopping carts from major e-commerce sites.

## Features

- **Add Single Products**: Click the floating "Add to ShopSmart" button on any product page
- **Import Shopping Carts**: Import entire carts from Shopify stores, SFCC/Demandware stores, and more
- **Platform Support**:
  - Shopify stores (thousands of stores)
  - Salesforce Commerce Cloud (Adidas, Puma, Burberry, etc.)
  - Generic support for any site with proper meta tags (JSON-LD, Open Graph)

## Installation

### Development Mode

1. **Generate Icons**: Before loading the extension, generate the required icon files:
   ```bash
   # Navigate to the icons directory
   cd chrome-extension/icons

   # Use a tool like ImageMagick to convert SVG to PNG
   # Or use an online SVG to PNG converter

   # Required sizes: 16x16, 48x48, 128x128
   ```

   You can also create icons manually or use the icon.svg as a reference.

2. **Load the Extension**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` directory

3. **Connect to ShopSmart**:
   - Open [ShopSmart Travel](https://shopsmart-800cb.web.app)
   - Log in to your account
   - Your trips will sync to the extension

## Usage

### Adding a Single Product

1. Navigate to any product page
2. You'll see a floating "Add to ShopSmart" button in the bottom right
3. Click the button
4. ShopSmart will open with the product details pre-filled
5. Review and save the item

### Importing a Shopping Cart

1. Navigate to your cart on a supported site
2. You'll see an "Import to ShopSmart" button
3. Click the button
4. ShopSmart will open with all cart items listed
5. Select which items to import and click "Import"

### Using the Popup

1. Click the extension icon in the Chrome toolbar
2. Select your default trip from the dropdown
3. Use the quick action buttons to add items or import carts

## Supported Sites

### Fully Supported (Cart Import)

- **Shopify**: Any store built on Shopify
- **SFCC/Demandware**: Adidas, Puma, Burberry, L'Oreal, and many luxury brands

### Generic Support (Product Pages)

Any site with proper structured data:
- JSON-LD Product schema
- Open Graph product tags
- Standard meta tags

## Development

### File Structure

```
chrome-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic
│   └── popup.css          # Popup styles
├── content/
│   ├── content.js         # Main content script
│   ├── content.css        # Content script styles
│   └── scrapers/
│       ├── generic.js     # Generic product scraper
│       ├── shopify.js     # Shopify cart scraper
│       └── sfcc.js        # SFCC/Demandware scraper
├── background/
│   └── service-worker.js  # Background service worker
└── icons/
    ├── icon.svg           # Source SVG icon
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

### Adding New Site Scrapers

1. Create a new file in `content/scrapers/`
2. Follow the pattern of existing scrapers (shopify.js, sfcc.js)
3. Add the scraper to `manifest.json` content_scripts
4. Register detection in the `getActiveScraper()` function in content.js

### Testing

1. Load the extension in developer mode
2. Visit various product and cart pages
3. Check the console for debug messages (`ShopSmart:` prefix)
4. Test the floating buttons and popup functionality

## Troubleshooting

### Extension not detecting products

- Ensure the page has proper structured data (JSON-LD or Open Graph)
- Check the browser console for error messages
- Try refreshing the page

### Cart import not working

- Ensure you're on the cart page (URL contains /cart or /basket)
- Some sites require you to be logged in
- Check if the site uses a supported platform (Shopify, SFCC)

### Trips not showing in popup

- Open ShopSmart and log in
- Create at least one trip
- The extension syncs trips from the app

## Privacy

- The extension only scrapes product data from pages you visit
- No data is sent to third parties
- All data is stored locally and in your ShopSmart account
