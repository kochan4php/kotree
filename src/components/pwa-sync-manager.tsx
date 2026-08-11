'use client';

import { useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { toast } from 'sonner';

export default function PwaSyncManager() {
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const offlineClicks = (await get('offline-clicks')) as string[] || [];
        if (offlineClicks.length > 0) {
          toast.info(`Syncing ${offlineClicks.length} offline interactions...`);
          
          for (const linkId of offlineClicks) {
            await fetch('/api/click-link-counter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linkId }),
            });
          }
          
          await set('offline-clicks', []);
          toast.success('Sync complete!');
        }
      } catch (error) {
        console.error('Failed to sync offline clicks', error);
      }
    };

    window.addEventListener('online', handleOnline);
    // Also run on mount in case they came online before React mounted
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}
