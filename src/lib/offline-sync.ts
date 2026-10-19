import { get, set } from 'idb-keyval';
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

// G9: the "Delivery notifications" switch in the dock. A service worker cannot
// read localStorage, so the choice is mirrored into the store the worker
// already opens for the CSRF token; the worker stays quiet when it is missing.
export async function setDeliveryNotifications(on: boolean): Promise<void> {
  try {
    await set('notify-on', on);
  } catch {
    // idb blocked (private mode) — deliveries then arrive without a notification
  }
}

// Ask for a background sync where the browser supports it (progressive).
// getRegistration() rather than .ready: .ready never settles when no worker
// ever activates (service workers blocked/unsupported), which would hang
// every caller queued behind it — the offline guestbook send among them.
export async function requestBackgroundSync(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = (await navigator.serviceWorker.getRegistration()) as
      | (ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } })
      | undefined;
    if (!reg) return; // no worker yet — the page's own online handler covers the queue
    await reg.sync?.register('kotree-sync-queues');
  } catch {
    // Background Sync unsupported — the online event covers it
  }
}

// K12: app-icon badge = how many things are still waiting to be sent (offline
// link taps + queued guestbook messages). Feature-detected; Chromium/Android
// only for now, silently skipped elsewhere.
export async function updateAppBadge(): Promise<void> {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    const [clicks, messages] = await Promise.all([get('offline-clicks'), get('offline-guestbook')]);
    const count = (Array.isArray(clicks) ? clicks.length : 0) + (Array.isArray(messages) ? messages.length : 0);
    if (count > 0) await nav.setAppBadge(count);
    else await nav.clearAppBadge();
  } catch {
    // badge unsupported or idb blocked — badges are decoration
  }
}
