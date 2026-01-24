# Day 8 Feature Deployment Guide: URL Scraping

## Overview

Day 8 implements URL scraping functionality to automatically extract product information from e-commerce URLs using Open Graph metadata and JSON-LD structured data.

## What's New

### Backend (Firebase Cloud Functions)

1. **New Function: `scrapeProductInfo`**
   - Location: `/functions/src/index.ts`
   - Type: HTTPS Callable Function
   - Extracts: Product name, image, description, price, and currency
   - Supports: Open Graph, Twitter Cards, JSON-LD, and meta tags

### Frontend Components

2. **URLFetchButton Component**
   - Location: `/src/components/Item/AddItem/URLFetchButton.tsx`
   - Allows users to paste a product URL and fetch details automatically
   - Shows loading states and error messages
   - Graceful fallback to manual input

3. **Updated AddShoppingItem Form**
   - Location: `/src/components/ShoppingList/AddShoppingItem.tsx`
   - Integrated URL fetch button at the top of the form
   - Auto-fills name, price, currency, image, and description
   - Shows fetched image preview with option to remove
   - Supports both URL fetching and manual image upload

4. **Updated EditShoppingItem Form**
   - Location: `/src/components/ShoppingList/EditShoppingItem.tsx`
   - Added description field support
   - Displays description when available

5. **Updated ShoppingListItem Display**
   - Location: `/src/components/ShoppingList/ShoppingListItem.tsx`
   - Shows product description below price
   - Already supported image display (from previous feature)

### Type Definitions

6. **Updated ShoppingList Types**
   - Location: `/src/types/ShoppingList.ts`
   - Added `imageUrl?: string` field
   - Added `description?: string` field

### Configuration

7. **Firebase Configuration**
   - Location: `/firebase.json`
   - Added functions configuration
   - Set up build process for TypeScript functions

## Deployment Steps

### 1. Install Firebase Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### 2. Build Cloud Functions

```bash
cd functions
npm run build
cd ..
```

### 3. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This will deploy the `scrapeProductInfo` function to your Firebase project.

### 4. Verify Function Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Functions
4. Verify that `scrapeProductInfo` is listed and active

### 5. Build and Deploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

### 6. Test the Feature

1. Open your deployed app
2. Log in with your account
3. Navigate to a trip
4. Click "Add Item"
5. Click "Fetch from URL"
6. Paste a product URL (e.g., from Amazon, eBay, or any e-commerce site)
7. Click "Fetch"
8. Verify that product information is auto-filled

## Testing URLs

Here are some URLs you can use to test the feature:

### Amazon
```
https://www.amazon.com/[any-product-url]
```

### eBay
```
https://www.ebay.com/itm/[any-product-url]
```

### Etsy
```
https://www.etsy.com/listing/[any-product-url]
```

Most modern e-commerce sites support Open Graph metadata and should work with this feature.

## Troubleshooting

### Function Not Found Error

If you get a "function not found" error:
1. Ensure functions are deployed: `firebase deploy --only functions`
2. Check Firebase Console to verify the function exists
3. Clear your browser cache and reload the app
4. Check the browser console for detailed error messages

### CORS Errors

Cloud Functions should not have CORS issues. If you encounter them:
1. Verify you're calling the function as an HTTPS Callable (not direct HTTP)
2. Check that you're logged in (function requires authentication)
3. Ensure your Firebase configuration is correct in `/src/services/firebase.ts`

### No Data Returned

If the function returns no data:
1. Check if the website has Open Graph tags (right-click → View Page Source)
2. Try a different product URL
3. Check Cloud Functions logs: `firebase functions:log`
4. Some websites may block automated requests - this is expected

### Timeout Errors

If requests timeout:
1. The website may be slow to respond
2. The website may be blocking automated requests
3. Check Cloud Functions logs for details
4. Users can still enter data manually

## Cost Implications

### Cloud Functions

- **Free Tier**: 2M invocations/month
- **Expected Usage**: ~10-100 invocations/day for most users
- **Cost**: Should stay within free tier

### Outbound Networking

- **Free Tier**: 5GB/month
- **Per Request**: ~50-500KB per scrape
- **Cost**: Should stay within free tier

## Monitoring

### View Function Logs

```bash
firebase functions:log --only scrapeProductInfo
```

### Monitor in Console

1. Go to Firebase Console
2. Navigate to Functions
3. Click on `scrapeProductInfo`
4. View usage statistics and logs

## Security Notes

1. **Authentication Required**: Only logged-in users can call the function
2. **Input Validation**: URLs are validated before scraping
3. **Timeout Protection**: 10-second timeout prevents abuse
4. **Error Handling**: No sensitive information leaked in errors

## Rollback Plan

If issues occur, you can rollback:

### Rollback Functions

```bash
# Deploy previous version
firebase deploy --only functions --version <previous-version>
```

### Rollback Frontend

```bash
# Rebuild from previous commit
git checkout <previous-commit>
npm run build
firebase deploy --only hosting
```

## Next Steps

After successful deployment:

1. **Day 9**: Image Upload & Display (already partially implemented)
2. **Day 10**: Currency Conversion (for USD calculations)
3. **Day 11-12**: PWA & Offline Support

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Check browser console for errors
3. Review the function code in `/functions/src/index.ts`
4. Test with Firebase Emulators locally before deploying
