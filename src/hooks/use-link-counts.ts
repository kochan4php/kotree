'use client';

import { useEffect, useState } from 'react';
import type { LinkCounter } from '@/interfaces';

// Module-level promise: one fetch per page load, shared by all consumers
// (SocialLinkList + StatsCard). One retry on failure, then give up for the session.
let shared: Promise<LinkCounter[]> | null = null;

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
  }, []);

  return counts;
}
