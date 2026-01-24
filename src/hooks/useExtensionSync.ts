import { useEffect, useState } from 'react';
import type { Trip } from '../types/Trip';

// Extension ID - will be set after loading unpacked extension
// For development, we use externally_connectable or postMessage
const EXTENSION_SYNC_KEY = 'shopsmart_extension_trips';

/**
 * Syncs trips to the Chrome extension via localStorage
 * The extension's content script can read this data
 */
export function useExtensionSync(trips: Trip[], defaultTripId?: string) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  useEffect(() => {
    if (!trips || trips.length === 0) return;

    // Check if we should show sync UI (from extension)
    const urlParams = new URLSearchParams(window.location.search);
    const isExtensionSync = urlParams.get('extensionSync') === 'true';

    // Simplified trip data for extension
    const extensionTrips = trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      budgetCurrency: trip.budgetCurrency,
    }));

    // Store in localStorage for extension to read
    const syncData = {
      trips: extensionTrips,
      defaultTripId: defaultTripId || trips[0]?.id,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(EXTENSION_SYNC_KEY, JSON.stringify(syncData));

      // Also dispatch a custom event for the extension content script
      window.dispatchEvent(
        new CustomEvent('shopsmart-trips-updated', { detail: syncData })
      );

      // If opened from extension, show confirmation
      if (isExtensionSync) {
        setSyncStatus('synced');

        // Clean up the URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) {
      console.debug('Failed to sync trips to extension:', e);
    }
  }, [trips, defaultTripId]);

  return { syncStatus };
}
