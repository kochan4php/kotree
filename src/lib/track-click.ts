import { get, set } from 'idb-keyval';
import { stashToken, requestBackgroundSync } from './offline-sync';

export async function syncOfflineClicks(token?: string): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  try {
    const offlineClicks: string[] = (await get('offline-clicks')) || [];
    if (offlineClicks.length === 0) return;

    // Claim the queue before posting — the service worker's background sync
    // may be flushing the same queue right now; whoever claims first wins.
    await set('offline-clicks', []);

    const remaining: string[] = [];
    for (const name of offlineClicks) {
      try {
        const res = await fetch('/api/click-link-counter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.toLowerCase(), count: 1, _token: token }),
        });
        if (!res.ok) remaining.push(name);
      } catch {
        remaining.push(name);
      }
    }
    if (remaining.length > 0) await set('offline-clicks', remaining);
  } catch {
    console.error('Failed to sync offline clicks');
  }
}

export async function trackLinkClick(name: string, token?: string): Promise<void> {
  try {
    if (!navigator.onLine) {
      throw new Error('Offline');
    }
    await fetch('/api/click-link-counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.toLowerCase(), count: 1, _token: token }),
      keepalive: true,
    });
  } catch {
    // Fallback to IndexedDB offline sync
    console.warn('Network offline or fetch failed, saving click locally via IndexedDB');
    try {
      const offlineClicks: string[] = (await get('offline-clicks')) || [];
      offlineClicks.push(name.toLowerCase());
      // Cap the queue: an offline streak shouldn't grow it forever
      await set('offline-clicks', offlineClicks.slice(-100));
    } catch {
      // Ignore idb errors in incognito mode
    }
    // Let the service worker retry even if the tab is closed
    await stashToken(token);
    await requestBackgroundSync();
  }
}
