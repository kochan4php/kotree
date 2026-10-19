'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readShelf, type ReadPage } from '@/lib/shelf';

// G2: a nudge back into the last page you started and did not finish. It only
// renders when this device has such a page, so an empty shelf adds nothing.
export default function ContinueReading() {
  const [page, setPage] = useState<ReadPage | null>(null);

  useEffect(() => {
    readShelf().then((shelf) => setPage(shelf.read.find((entry) => entry.progress < 95) ?? null));
  }, []);

  if (!page) return null;

  return (
    <div className="fluid-glass rounded-lg border-[3px] border-foreground bg-card p-4 shadow-[3px_3px_0_0_var(--foreground)]">
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
        Continue reading
      </p>
      <Link
        href={page.path}
        className="mt-1 block text-sm font-black text-foreground hover:text-accent-ink transition-colors"
      >
        {page.title}
      </Link>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={page.progress}
        aria-label={`${page.title} — ${page.progress}% read`}
        className="mt-2 h-2 overflow-hidden rounded-full border-2 border-foreground bg-secondary"
      >
        <div className="h-full bg-accent" style={{ width: `${page.progress}%` }} />
      </div>
      <p className="mt-1 text-[10px] font-mono font-bold text-muted-foreground">
        {page.progress}% read ·{' '}
        <Link href="/shelf" className="hover:text-foreground hover:underline underline-offset-2">
          your shelf
        </Link>
      </p>
    </div>
  );
}
