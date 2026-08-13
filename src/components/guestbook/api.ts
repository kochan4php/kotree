import type { GuestbookEntry } from './types';

export async function fetchEntries(): Promise<GuestbookEntry[]> {
  try {
    const res = await fetch('/api/guestbook');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function postEntry(message: string, token?: string): Promise<void> {
  await fetch('/api/guestbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, _token: token }),
  });
}
