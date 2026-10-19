import type { GuestbookEntry } from './types';
import { queueMessage } from './offline';

export class GuestbookHttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`guestbook POST failed: ${status}`);
    this.status = status;
  }
}

export async function fetchEntries(limit = 10, before?: string, sort: 'newest' | 'top' = 'newest'): Promise<GuestbookEntry[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    if (sort === 'top') params.set('sort', 'top');
    const res = await fetch(`/api/guestbook?${params}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// K30: reports are counted server-side and never shown publicly
export async function reportEntry(id: string, token?: string): Promise<{ reported: boolean; hidden: boolean }> {
  const res = await fetch('/api/guestbook/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, _token: token }),
  });
  if (!res.ok) throw new Error(`guestbook report failed: ${res.status}`);
  return res.json();
}

// M40: 'sent' carries the server id so the device can edit or delete it later.
// 'queued' means the network was unreachable and the message was stored
// locally; HTTP rejections still throw so the caller can revert the
// optimistic entry (or start a cooldown on 429).
// H4: a held post is stored hidden for review, so the caller must not keep it
// on the wall it just posted to.
export async function postEntry(
  message: string,
  token?: string,
  owner?: string,
): Promise<{ status: 'sent' | 'queued'; id?: string; held?: boolean }> {
  let res: Response;
  try {
    res = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, _token: token, owner }),
    });
  } catch {
    await queueMessage(message);
    return { status: 'queued' };
  }
  if (!res.ok) throw new GuestbookHttpError(res.status);
  const data = await res.json().catch(() => null);
  return {
    status: 'sent',
    id: typeof data?.id === 'string' ? data.id : undefined,
    held: data?.held === true,
  };
}

// M46: counted=false means today's vote for this entry was already in the
// count (another tab or device) — the caller rolls its optimistic bump back.
export async function reactToEntry(id: string, reaction: string, token?: string): Promise<{ counted: boolean }> {
  const res = await fetch('/api/guestbook', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, reaction, _token: token }),
  });
  if (!res.ok) throw new Error(`guestbook PATCH failed: ${res.status}`);
  const data = await res.json().catch(() => null);
  return { counted: data?.counted !== false };
}

// M40/M41: the device token proves ownership. The server enforces the
// five-minute edit window itself; the client only mirrors the rule.
export async function deleteOwnEntry(id: string, owner: string): Promise<void> {
  const res = await fetch(`/api/guestbook?id=${encodeURIComponent(id)}&owner=${encodeURIComponent(owner)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`guestbook DELETE failed: ${res.status}`);
}

export async function editOwnEntry(id: string, owner: string, message: string, token?: string): Promise<void> {
  const res = await fetch('/api/guestbook', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, owner, message, _token: token }),
  });
  if (!res.ok) throw new Error(`guestbook PUT failed: ${res.status}`);
}
