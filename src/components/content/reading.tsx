import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { styleOf } from '@/lib/css-vars';
import type { CSSProperties } from 'react';

// K19/K20: the reading aids shared by note and project pages — a table of
// contents built from the article headings, prev/next through the collection
// and a "related" list ranked by shared tags.

// M36: names the per-heading view-timelines on their common ancestor, so the
// TOC links (also descendants) can consume them. Spread onto the card wrapper
// that contains both the article and the table of contents.
export function tocTimelineScope(headings: { id: string }[]): CSSProperties | undefined {
  if (headings.length === 0) return undefined;
  return styleOf({ viewTimelineScope: headings.map((heading) => `--kt-${heading.id}`).join(', ') });
}

export function TableOfContents({ headings }: { headings: { id: string; text: string; level: 'h2' | 'h3' }[] }) {
  // One heading is just a section, not a table of contents
  if (headings.length < 2) return null;
  return (
    <nav
      aria-label="On this page"
      className="mt-5 rounded-lg border-[3px] border-foreground bg-secondary/60 p-3 shadow-[2px_2px_0_0_var(--foreground)]"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">On this page</p>
      <ul className="mt-2 space-y-1">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 'h3' ? 'pl-4' : ''}>
            <a
              href={`#${heading.id}`}
              style={styleOf({ '--kt-tl': `--kt-${heading.id}` })}
              className="kt-toc-link inline-flex min-h-6 items-center text-sm font-bold text-foreground decoration-accent decoration-2 underline-offset-2 hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PrevNext({
  items,
  currentSlug,
  base,
}: {
  items: { slug: string; title: string }[];
  currentSlug: string;
  base: '/notes' | '/projects';
}) {
  const index = items.findIndex((item) => item.slug === currentSlug);
  // Sorted newest-first: the previous entry is newer, the next one older
  const newer = index > 0 ? items[index - 1] : null;
  const older = index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  if (!newer && !older) return null;

  const linkClass =
    'inline-flex max-w-full items-center gap-1.5 rounded-lg border-2 border-foreground bg-card px-3 py-2 text-sm font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--foreground)]';
  return (
    <nav aria-label="More content" className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
      {older ? (
        <Link href={`${base}/${older.slug}`} className={linkClass}>
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{older.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {newer ? (
        <Link href={`${base}/${newer.slug}`} className={`${linkClass} sm:ml-auto`}>
          <span className="truncate">{newer.title}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}

export function RelatedList({
  items,
  base,
}: {
  items: { slug: string; title: string; summary: string }[];
  base: '/notes' | '/projects';
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6 border-t-[3px] border-foreground pt-4">
      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">Related</h2>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`${base}/${item.slug}`} className="group block">
              <span className="font-bold text-foreground decoration-accent decoration-2 underline-offset-2 group-hover:underline">
                {item.title}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground leading-relaxed">{item.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
