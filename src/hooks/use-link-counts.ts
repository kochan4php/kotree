'use client';

import { useEffect, useState } from 'react';
import type { LinkCounter } from '@/interfaces';

// Module-level promise: one fetch per page load, shared by all consumers
// (SocialLinkList + StatsCard). ponytail: reset only on hard reload.
let shared: Promise<LinkCounter[]> | null = null;

export function useLinkCounts(): LinkCounter[] {
  const [counts, setCounts] = useState<LinkCounter[]>([]);

  useEffect(() => {
    if (!shared) {
      shared = fetch('/api/click-link-counter')
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);
    }
    shared.then(setCounts);
  }, []);

  return counts;
}
