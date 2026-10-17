import { slugifyTag } from '@/lib/content';
import Link from 'next/link';

// K18: tag chips on note/project pages, each pointing at its tag page. Renders
// nothing when the item has no tags, so callers stay one-liners.
export default function TagChips({ tags, base }: { tags: string[]; base: '/notes' | '/projects' }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`${base}/tags/${slugifyTag(tag)}`}
          className="rounded border-2 border-foreground bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}
