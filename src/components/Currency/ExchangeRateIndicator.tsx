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
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Loading exchange rates...</span>
      </div>
    );
  }

  if (error && !lastUpdated) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500 px-3 py-2 bg-red-50 rounded-lg">
        <Info className="w-3 h-3" />
        <span>Failed to load exchange rates</span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-2 text-red-600 hover:text-red-700 underline disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
      <Info className="w-3 h-3 text-blue-600" />
      <span className="text-blue-700">
        Exchange rates updated {lastUpdated ? formatLastUpdated(lastUpdated) : 'recently'}
      </span>
      {canRefresh && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-auto p-1 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
          title="Refresh exchange rates"
        >
          <RefreshCw className={`w-3 h-3 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
