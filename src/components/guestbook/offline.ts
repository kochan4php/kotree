import { get, set } from 'idb-keyval';
import { stashToken, requestBackgroundSync } from '@/lib/offline-sync';

// Same raw-idb shape the service worker reads for background sync.
const KEY = 'offline-guestbook';
const MAX = 20; // cap: an offline streak shouldn't grow the queue forever

export async function queueMessage(message: string): Promise<void> {
  try {
    const q: string[] = (await get(KEY)) || [];
    await set(KEY, [...q, message].slice(-MAX));
  } catch {
    // idb unavailable (private mode) — the optimistic entry still reverts on reload
  }
  // Let the service worker retry even if the tab is closed
  await stashToken();
  await requestBackgroundSync();
}

export async function queuedMessages(): Promise<number> {
  try {
    return ((await get(KEY)) as string[] | undefined)?.length ?? 0;
  } catch {
    return 0;
  }
}

// Deliver everything queued while offline. Returns how many are still waiting.
export async function flushQueue(token?: string): Promise<number> {
  try {
    const q: string[] = (await get(KEY)) || [];
    if (q.length === 0 || !navigator.onLine) return q.length;

    // Claim the queue before posting — the service worker's background sync
    // may be flushing the same queue right now; whoever claims first wins.
    await set(KEY, []);

    const remaining: string[] = [];
    for (let i = 0; i < q.length; i++) {
      try {
        const res = await fetch('/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: q[i], _token: token }),
        });
        if (!res.ok) remaining.push(q[i]); // server said no — keep it for a later retry
      } catch {
        remaining.push(q[i]);
      }
    }
    if (remaining.length > 0) await set(KEY, remaining);
    return remaining.length;
  } catch {
    return 0;
  }
}
