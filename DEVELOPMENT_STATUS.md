# ShopSmart Travel - Development Status

**Last Updated:** January 25, 2026
**Current Extension Version:** 1.1.5

## Recent Session Summary

### Completed Features

#### 1. "Save for Later" Feature
- Added `savedForLater` boolean field to `ShoppingListItem` type
- Items can be saved for later instead of deleted
- Saved items are hidden from main list but accessible via collapsible "Saved for Later" section
- Restore button brings items back to main list
- Files modified:
  - `src/types/ShoppingList.ts` - Added `savedForLater` field
  - `src/hooks/useShoppingList.ts` - Added `saveForLater` function
  - `src/components/ShoppingList/ShoppingListItemTile.tsx` - Added save/restore button (icon only)
  - `src/components/ShoppingList/ShoppingListItem.tsx` - Added save/restore button
  - `src/pages/TripDetailPage.tsx` - Added filtering and collapsible saved items section

#### 2. Tile View Action Buttons
- Changed from text labels to icon-only buttons to prevent text cutoff
- Icons: Edit (blue), Bookmark/Restore (amber/green), Delete (red)
- Tooltips show on hover

#### 3. Extension Version Display
- Version number now shown in popup header (e.g., "v1.1.5")
- Makes it easy to verify which version is loaded

### Extension Improvements (v1.1.3 → v1.1.5)

#### Page Detection Fixes
- **Problem:** Max Mara product pages (`/p-...`) were detected as cart pages
- **Problem:** La Grande Epicerie cart page (`/my-cart`) was detected as product page
- **Solution:**
  - Created `isCartUrl()` helper that checks URL first (highest priority)
  - Cart URL patterns: `/cart`, `/my-cart`, `/basket`, `/bag`, `/checkout`, `/panier`, `/carrello`, `/warenkorb`
  - Product URL patterns: `/p-`, `/product/`, `/products/`, `/item/`, `/pdp/`
  - If URL clearly indicates cart → cart page (even if has product elements)
  - If URL clearly indicates product → product page (even if has cart elements)

#### Cart Scraping Improvements (v1.1.5)
- Auto-detects currency from page (€, £, ¥)
- Many more cart item selectors:
  - `[class*="cart-item"]`, `[class*="line-item"]`, `[class*="product-line"]`
  - Demandware/SFCC: `.cart-row`, `.product-list-item`
  - Generic: `[class*="item-row"]`, `[class*="product-row"]`
- Fallback pattern matching: finds containers with both images and prices
- Better European price parsing (comma as decimal separator)
- Uses image alt text as product name fallback

### Known Issues / In Progress

#### 1. La Grande Epicerie Cart Import
- **Status:** Cart page detected correctly in v1.1.5, but cart items may still not be detected
- **Next steps:** Test v1.1.5 cart scraping, may need to inspect actual DOM structure

#### 2. La Grande Epicerie Product Images
- **Status:** Product page images not being captured
- **Reason:** Site uses Demandware/Salesforce Commerce Cloud with non-standard image patterns
- **Attempted fix:** Added detection for `master-catalog` and `/images/DIS/` URL patterns
- **Next steps:** May need further debugging - detection code works in console but not in extension (possible caching issue)

### File Structure

```
/Users/davesuzuki/shopsmart-travel/
├── src/
│   ├── components/ShoppingList/
│   │   ├── ShoppingListItem.tsx      # List view item component
│   │   ├── ShoppingListItemTile.tsx  # Tile view item component
│   │   └── AddShoppingItem.tsx       # Add item modal
│   ├── pages/
│   │   ├── TripDetailPage.tsx        # Main shopping list page
│   │   └── LandingPage.tsx           # Marketing/download page
│   ├── hooks/
│   │   └── useShoppingList.ts        # Shopping list Firebase hook
│   └── types/
│       └── ShoppingList.ts           # TypeScript interfaces
├── chrome-extension-v2/
│   ├── manifest.json                 # Version 1.1.5
│   ├── content/content.js            # Page detection & scraping
│   ├── popup/
│   │   ├── popup.html                # Extension popup UI
│   │   ├── popup.css                 # Popup styles
│   │   └── popup.js                  # Popup logic
│   └── background/service-worker.js  # Auth handling
└── public/
    └── shopsmart-extension.zip       # Downloadable extension
```

### Deployment

- **Web App:** https://shopsmart-800cb.web.app
- **Firebase Project:** shopsmart-800cb
- **Extension:** Download from landing page or load from `chrome-extension-v2/` folder

### Commands

```bash
# Build web app
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Create extension zip
cd chrome-extension-v2 && zip -r ../public/shopsmart-extension.zip . -x "*.DS_Store"

# Full deploy (build + deploy)
npm run build && firebase deploy --only hosting
```

### Testing Notes

When testing extension changes:
1. Update version in `chrome-extension-v2/manifest.json`
2. Rebuild zip: `rm -f public/shopsmart-extension.zip && cd chrome-extension-v2 && zip -r ../public/shopsmart-extension.zip . -x "*.DS_Store"`
3. In Chrome: Go to `chrome://extensions/`, click refresh on ShopSmart Travel
4. Check version badge in popup header to confirm update loaded
5. May need to refresh the webpage being tested for new content script to load
