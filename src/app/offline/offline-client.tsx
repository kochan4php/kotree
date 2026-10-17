'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get as idbGet } from 'idb-keyval';
import { WifiOff, RefreshCw } from 'lucide-react';

// K10 — the offline shell now tells the visitor what still works: which
// pages are cached, how many taps/messages are queued, and it reloads itself
// the moment the connection comes back.
const CANDIDATES = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/notes', label: 'Notes' },
  { href: '/about', label: 'About' },
  { href: '/now', label: 'Now' },
  { href: '/guestbook', label: 'Guestbook' },
  { href: '/secrets', label: 'Secrets' },
  { href: '/changelog', label: 'Changelog' },
];

export default function OfflineClient() {
  const [cachedPages, setCachedPages] = useState<string[] | null>(null);
  const [pending, setPending] = useState(0);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const found: string[] = [];
      try {
        for (const page of CANDIDATES) {
          if (await caches.match(page.href)) found.push(page.href);
        }
      } catch {
        // Cache API unavailable — show no page list
      }
      let queued = 0;
      try {
        const clicks = await idbGet('offline-clicks');
        const messages = await idbGet('offline-guestbook');
        queued = (Array.isArray(clicks) ? clicks.length : 0) + (Array.isArray(messages) ? messages.length : 0);
      } catch {
        // no queues in this browser
      }
      if (!cancelled) {
        setCachedPages(found);
        setPending(queued);
      }
    })();

    const onOnline = () => {
      setBackOnline(true);
      // Give the notice a beat to render, then come back to life
      setTimeout(() => location.reload(), 800);
    };
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (backOnline) {
    return (
      <div className="text-center">
        <RefreshCw className="w-8 h-8 mx-auto text-accent-ink animate-spin" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">Back online</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">Refreshing the page…</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <WifiOff className="w-8 h-8 mx-auto text-accent-ink" aria-hidden="true" />
      <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
        The internet connection dropped. Pages you&apos;ve already visited still work, and any secrets or link taps
        you&apos;ve queued will be sent automatically once you&apos;re back online.
      </p>

      {pending > 0 && (
        <p className="mt-3 inline-block rounded-lg border-2 border-foreground bg-amber-300 px-3 py-1 text-xs font-bold text-[#14110f]">
          {pending} {pending === 1 ? 'item' : 'items'} waiting to send
        </p>
      )}

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => location.reload()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[3px] border-foreground bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-[3px_3px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)]"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Try again
        </button>
      </div>

      {cachedPages && cachedPages.length > 0 && (
        <div className="mt-6 border-t-2 border-dashed border-foreground/30 pt-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Available offline
          </p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {CANDIDATES.filter((page) => cachedPages.includes(page.href)).map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="inline-block rounded-lg border-2 border-foreground bg-secondary px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--foreground)]"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
