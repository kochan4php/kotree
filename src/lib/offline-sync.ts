import { set } from 'idb-keyval';
import { clientToken } from './csrf-client';

// The service worker replays the offline queues in the background; it needs
// the CSRF token (and its age) stashed next to them, since it can't generate
// one itself.
export async function stashToken(token?: string): Promise<void> {
  try {
    await set('csrf-token', { token: token ?? clientToken(), at: Date.now() });
  } catch {
    // idb unavailable (private mode) — the page's own online handler still retries
  }
}

// Ask for a background sync where the browser supports it (progressive).
export async function requestBackgroundSync(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    await reg.sync?.register('kotree-sync-queues');
  } catch {
    // Background Sync unsupported — the online event covers it
  }
}
