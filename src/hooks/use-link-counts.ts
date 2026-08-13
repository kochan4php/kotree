'use client';

import { useEffect, useState } from 'react';
import type { LinkCounter } from '@/interfaces';

// Module-level promise: one fetch per page load, shared by all consumers
// (SocialLinkList + StatsCard). One retry on failure, then give up for the session.
let shared: Promise<LinkCounter[]> | null = null;
const listeners = new Set<(counts: LinkCounter[]) => void>();

function fetchCounts(): Promise<LinkCounter[]> {
  return fetch('/api/click-link-counter')
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => fetch('/api/click-link-counter').then((res) => (res.ok ? res.json() : [])).catch(() => []));
}

export function useLinkCounts(): LinkCounter[] {
  const [counts, setCounts] = useState<LinkCounter[]>([]);

  useEffect(() => {
    if (!shared) {
      shared = fetchCounts();
    }
    shared.then(setCounts);
    listeners.add(setCounts);
    return () => {
      listeners.delete(setCounts);
    };
  }, []);

  return counts;
}

// Re-fetch after a successful click so badges/stats update without a reload.
// Only call when online — an offline refetch would blank the counts.
export function refreshLinkCounts(): void {
  shared = fetchCounts();
  shared.then((counts) => listeners.forEach((fn) => fn(counts)));
}
