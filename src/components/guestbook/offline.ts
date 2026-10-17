import { get, set } from 'idb-keyval';

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
    // Keep the whole queue if nothing made it (connection died mid-flush)
    await set(KEY, remaining);
    return remaining.length;
  } catch {
    return 0;
  }
}
