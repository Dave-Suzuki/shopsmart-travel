import { useState } from 'react';
import { Link2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface ProductInfo {
  name?: string;
  image?: string;
  description?: string;
  price?: number;
  currency?: string;
  brand?: string;
  error?: string;
}

interface URLFetchButtonProps {
  onDataFetched: (data: {
    name?: string;
    imageUrl?: string;
    description?: string;
    price?: number;
    currency?: string;
    brand?: string;
    productUrl?: string;
  }) => void;
}

export function URLFetchButton({ onDataFetched }: URLFetchButtonProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [fetchedFields, setFetchedFields] = useState<string[]>([]);

  const handleFetch = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const functions = getFunctions();
      const scrapeProductInfo = httpsCallable<{ url: string }, ProductInfo>(
        functions,
        'scrapeProductInfo'
      );

      const result = await scrapeProductInfo({ url: url.trim() });
      const data = result.data;

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Validate URL is HTTP/HTTPS only before storing
      let validatedUrl: string;
      try {
        const urlObj = new URL(url.trim());
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          setError('Only HTTP/HTTPS URLs are allowed');
          setLoading(false);
          return;
        }
        validatedUrl = urlObj.href; // Use normalized URL
      } catch (e) {
        setError('Invalid URL format');
        setLoading(false);
        return;
      }

      // Prepare the data to pass to the parent
      const fetchedData: {
        name?: string;
        imageUrl?: string;
        description?: string;
        price?: number;
        currency?: string;
        brand?: string;
        productUrl?: string;
      } = {};

      if (data.name) fetchedData.name = data.name;
      if (data.image) fetchedData.imageUrl = data.image;
      if (data.description) fetchedData.description = data.description;
      if (data.price !== undefined) fetchedData.price = data.price;
      if (data.currency) fetchedData.currency = data.currency;
      if (data.brand) fetchedData.brand = data.brand;
      // Include the validated URL
      fetchedData.productUrl = validatedUrl;

      // Check if we got any data
      if (Object.keys(fetchedData).length === 0) {
        setError('No product information found on this page. Please enter details manually.');
        setLoading(false);
        return;
      }

      // Pass the data to the parent component
      onDataFetched(fetchedData);

      // Show what was found
      const foundItems = [];
      if (fetchedData.name) foundItems.push('name');
      if (fetchedData.brand) foundItems.push('brand');
      if (fetchedData.imageUrl) foundItems.push('image');
      if (fetchedData.description) foundItems.push('description');
      if (fetchedData.price !== undefined) foundItems.push('price');
      if (fetchedData.currency) foundItems.push('currency');

      console.log('Found data:', foundItems.join(', '));
      setFetchedFields(foundItems);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowInput(false);
        setUrl('');
        setFetchedFields([]);
      }, 3000);
    } catch (err: any) {
      console.error('Error fetching product info:', err);
      setError(
        err.message || 'Failed to fetch product information. Please try again or enter details manually.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFetch();
    }
  };

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm"
      >
        <Link2 className="w-5 h-5" />
        <span>Fetch from URL</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* URL Input - Full width on mobile */}
      <div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Paste product URL here..."
          className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
          disabled={loading}
          autoFocus
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <Link2 className="w-5 h-5" />
              Fetch
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowInput(false);
            setUrl('');
            setError(null);
            setSuccess(false);
          }}
          className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 mb-1">
              Found: {fetchedFields.join(', ')}
            </p>
            {!fetchedFields.includes('price') && (
              <p className="text-xs text-orange-600">
                ⚠️ Price not found - please enter manually
              </p>
            )}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 How it works:</p>
        <p className="text-xs">
          Copy a product link from Amazon, eBay, Etsy, or any online store and paste it above. We'll automatically fill in the name, price, image, and description!
        </p>
      </div>
    </div>
  );
}
