'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import Skeleton from '@/components/ui/skeleton';
import { forgetRead, readShelf, removeHighlight, toggleSaved, type Shelf } from '@/lib/shelf';

// G2: everything the shelf holds, read from this device on mount. Nothing is
// fetched, so the page works offline and is never out of date.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="fluid-glass">
      <div className="relative z-10">
        <h2 className="text-lg font-black tracking-tight text-foreground">{title}</h2>
        {children}
      </div>
    </Card>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded border-2 border-foreground bg-card text-foreground cursor-pointer hover:bg-destructive transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );
}

function Row({
  href,
  title,
  meta,
  action,
}: {
  href: string;
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b-2 border-foreground/10 pb-2 last:border-0 last:pb-0">
      <div className="min-w-0">
        <Link
          href={href}
          className="block truncate text-sm font-bold text-foreground hover:text-accent-ink hover:underline underline-offset-2 transition-colors"
        >
          {title}
        </Link>
        {meta && (
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">{meta}</p>
        )}
      </div>
      {action}
    </li>
  );
}

export default function ShelfBoard() {
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const load = useCallback(() => {
    readShelf().then(setShelf);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!shelf) {
    return (
      <div className="mt-3">
        <Skeleton rows={2} />
      </div>
    );
  }

  if (shelf.saved.length === 0 && shelf.read.length === 0 && shelf.highlights.length === 0) {
    return (
      <Card className="fluid-glass mt-3">
        <div className="relative z-10">
          <EmptyState
            title="Nothing on the shelf yet"
            hint="Save a note or a project while you read — progress and highlights record themselves. Everything here stays in this browser."
          >
            <Link
              href="/notes"
              className="mt-1 inline-flex min-h-6 items-center text-xs font-bold text-foreground underline underline-offset-2"
            >
              Browse the notes
            </Link>
          </EmptyState>
        </div>
      </Card>
    );
  }

  const unfinished = shelf.read.filter((page) => page.progress < 95);
  const finished = shelf.read.filter((page) => page.progress >= 95);

  return (
    <div className="mt-3 space-y-3">
      {unfinished.length > 0 && (
        <Section title="Continue reading">
          <ul className="mt-3 space-y-3">
            {unfinished.map((page) => (
              <Row
                key={page.path}
                href={page.path}
                title={page.title}
                meta={`${page.progress}% read`}
                action={
                  <RemoveButton
                    label={`Forget your progress on ${page.title}`}
                    onClick={async () => setShelf(await forgetRead(page.path))}
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {shelf.saved.length > 0 && (
        <Section title="Saved">
          <ul className="mt-3 space-y-3">
            {shelf.saved.map((page) => (
              <Row
                key={page.path}
                href={page.path}
                title={page.title}
                action={
                  <RemoveButton
                    label={`Remove ${page.title} from your shelf`}
                    onClick={async () => setShelf(await toggleSaved(page.path, page.title))}
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {shelf.highlights.length > 0 && (
        <Section title="Highlights">
          <ul className="mt-3 space-y-3">
            {shelf.highlights.map((highlight) => (
              <li
                key={highlight.at}
                className="border-b-2 border-foreground/10 pb-3 last:border-0 last:pb-0"
              >
                <blockquote className="text-sm font-medium italic text-foreground">{highlight.text}</blockquote>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <Link
                    href={highlight.path}
                    className="truncate text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
                  >
                    {highlight.title}
                  </Link>
                  <RemoveButton
                    label={`Remove this highlight from ${highlight.title}`}
                    onClick={async () => setShelf(await removeHighlight(highlight.at))}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {finished.length > 0 && (
        <Section title="Read">
          <ul className="mt-3 space-y-3">
            {finished.map((page) => (
              <Row
                key={page.path}
                href={page.path}
                title={page.title}
                meta="Finished"
                action={
                  <RemoveButton
                    label={`Forget that you read ${page.title}`}
                    onClick={async () => setShelf(await forgetRead(page.path))}
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
