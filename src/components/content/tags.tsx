import { formatDate } from '@/lib/content';
import Link from 'next/link';

// K18: the two halves of the tag pages — an index of every tag and the list
// of items under one tag. Shared by /notes/tags and /projects/tags.

export function TagIndex({
  tags,
  base,
}: {
  tags: { tag: string; slug: string; count: number }[];
  base: '/notes' | '/projects';
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((entry) => (
        <Link
          key={entry.slug}
          href={`${base}/tags/${entry.slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground bg-secondary px-3 py-1.5 text-sm font-bold text-foreground shadow-[2px_2px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground hover:shadow-[3px_3px_0_0_var(--foreground)]"
        >
          {entry.tag}
          <span className="text-[10px] font-mono opacity-60">{entry.count}</span>
        </Link>
      ))}
    </div>
  );
}

export function TaggedList({
  items,
  base,
}: {
  items: { slug: string; title: string; summary: string; date: string }[];
  base: '/notes' | '/projects';
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            href={`${base}/${item.slug}`}
            className="block rounded-lg border-[3px] border-foreground bg-card p-3 shadow-[2px_2px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--foreground)]"
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              {formatDate(item.date)}
            </span>
            <span className="mt-1 block font-black tracking-tight text-foreground">{item.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground leading-relaxed">{item.summary}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
