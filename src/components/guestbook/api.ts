import type { GuestbookEntry } from './types';

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

export async function postEntry(message: string, token?: string): Promise<void> {
  const res = await fetch('/api/guestbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, _token: token }),
  });
  // Reject on HTTP errors too — the caller's catch reverts the optimistic entry
  if (!res.ok) throw new Error(`guestbook POST failed: ${res.status}`);
}
