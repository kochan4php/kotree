'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

// K24: a returning visitor sees one toast pointing at what changed since the
// version they last saw. First-ever visitors see nothing (nothing to catch up
// on), and the toast never repeats — the seen version is stored on sight.
const SEEN_KEY = 'kotree-seen-version';

export default function WhatsNew() {
  const router = useRouter();

  useEffect(() => {
    const current = process.env.APP_VERSION;
    if (!current) return;

    let seen: string | null = null;
    try {
      seen = localStorage.getItem(SEEN_KEY);
    } catch {
      return; // private mode — no memory, no toast
    }

    // Opening the changelog counts as seeing it
    if (window.location.pathname.startsWith('/changelog')) {
      try {
        localStorage.setItem(SEEN_KEY, current);
      } catch {
        // private mode
      }
      return;
    }

    if (seen === current) return;
    try {
      localStorage.setItem(SEEN_KEY, current);
    } catch {
      // private mode
    }
    if (!seen) return;

    // Let the page settle first — the toast shouldn't race the first paint
    const timer = setTimeout(() => {
      toast(`Kotree ${current} — see what changed`, {
        id: 'whats-new',
        duration: 10000,
        action: {
          label: 'See changes',
          onClick: () => router.push(`/changelog#${current}`),
        },
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
