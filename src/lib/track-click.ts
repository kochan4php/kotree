import { get, set } from 'idb-keyval';

export async function syncOfflineClicks(token?: string): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  
  try {
    const offlineClicks: string[] = (await get('offline-clicks')) || [];
    if (offlineClicks.length === 0) return;

    for (const name of offlineClicks) {
      await fetch('/api/click-link-counter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.toLowerCase(), count: 1, _token: token }),
      });
    }
    await set('offline-clicks', []);
  } catch (e) {
    console.error('Failed to sync offline clicks', e);
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
  } catch (error) {
    // Fallback to IndexedDB offline sync
    console.warn('Network offline or fetch failed, saving click locally via IndexedDB');
    try {
      const offlineClicks: string[] = (await get('offline-clicks')) || [];
      offlineClicks.push(name.toLowerCase());
      await set('offline-clicks', offlineClicks);
    } catch (e) {
      // Ignore idb errors in incognito mode
    }
  }
}
