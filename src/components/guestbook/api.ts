import type { GuestbookEntry } from './types';
import { queueMessage } from './offline';

export class GuestbookHttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`guestbook POST failed: ${status}`);
    this.status = status;
  }
}

export async function fetchEntries(limit = 10, before?: string): Promise<GuestbookEntry[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    const res = await fetch(`/api/guestbook?${params}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// 'queued' means the network was unreachable and the message was stored
// locally; HTTP rejections still throw so the caller can revert the
// optimistic entry (or start a cooldown on 429).
export async function postEntry(message: string, token?: string): Promise<'sent' | 'queued'> {
  let res: Response;
  try {
    res = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, _token: token }),
    });
  } catch {
    await queueMessage(message);
    return 'queued';
  }
  if (!res.ok) throw new GuestbookHttpError(res.status);
  return 'sent';
}

export async function reactToEntry(id: string, reaction: string, token?: string): Promise<void> {
  const res = await fetch('/api/guestbook', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, reaction, _token: token }),
  });
  if (!res.ok) throw new Error(`guestbook PATCH failed: ${res.status}`);
}
