import { RefreshCw, Info } from 'lucide-react';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { formatLastUpdated } from '../../utils/currency';
import { useState } from 'react';

export function ExchangeRateIndicator() {
  const { lastUpdated, loading, error, canRefresh, refetch } = useExchangeRate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading && !lastUpdated) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 px-3 py-2 bg-gray-50 rounded-lg">
        <RefreshCw className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" />
        <span>Loading exchange rates...</span>
      </div>
    );
  }

  if (error && !lastUpdated) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600 pl-3 pr-1 bg-red-50 rounded-lg">
        <Info className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 py-2">Failed to load exchange rates</span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="min-h-11 px-3 text-red-700 hover:text-red-800 underline disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-600 pl-3 bg-blue-50 rounded-lg border border-blue-100 ${canRefresh ? 'pr-0' : 'pr-3 py-2'}`}>
      <Info className="w-3 h-3 text-blue-600 flex-shrink-0" aria-hidden="true" />
      <span className="text-blue-700">
        Exchange rates updated {lastUpdated ? formatLastUpdated(lastUpdated) : 'recently'}
      </span>
      {canRefresh && (
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh exchange rates"
          className="ml-auto flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
