import { Card } from '@/components/ui/card';
import { TaggedList } from '@/components/content/tags';
import { collectTags, getNotes, slugifyTag } from '@/lib/content';
import { TAG_INTROS } from '@/lib/tag-descriptions';
import { site } from '@/lib/site';
import { breadcrumbLd, collectionPageLd, pageOg } from '@/lib/seo';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams() {
  return collectTags(getNotes()).map((entry) => ({ tag: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const match = collectTags(getNotes()).find((entry) => entry.slug === tag);
  if (!match) return { title: 'Not found' };
  return {
    title: `Notes tagged ${match.tag}`,
    description: TAG_INTROS[match.tag.toLowerCase()] ?? `Kotree notes tagged "${match.tag}".`,
    alternates: { canonical: `${site.baseUrl}/notes/tags/${tag}` },
    ...pageOg(`tag-${tag}`, `Notes tagged ${match.tag}`),
  };
}

export default async function NoteTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const notes = getNotes();
  const match = collectTags(notes).find((entry) => entry.slug === tag);
  if (!match) notFound();

  const items = notes.filter((note) => note.tags.some((t) => slugifyTag(t) === tag));

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd(`Tag: ${match.tag}`, `/notes/tags/${tag}`)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            collectionPageLd(
              `Notes tagged ${match.tag}`,
              `/notes/tags/${tag}`,
              items.map((note) => ({ title: note.title, url: `${site.baseUrl}/notes/${note.slug}` }))
            )
          ),
        }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/notes/tags"
          className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All tags
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight text-foreground">{match.tag}</h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              {TAG_INTROS[match.tag.toLowerCase()] ?? `Notes tagged “${match.tag}”.`}
            </p>
            <p className="mt-2 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              {items.length} {items.length === 1 ? 'note' : 'notes'}
            </p>
            {(() => {
              const related = collectTags(items)
                .filter((entry) => entry.slug !== tag)
                .slice(0, 6);
              return related.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {related.map((entry) => (
                    <Link key={entry.slug} href={`/notes/tags/${entry.slug}`} className="min-h-6 inline-flex items-center rounded border-2 border-foreground bg-card px-2 py-0.5 text-[11px] font-bold text-foreground hover:bg-accent hover:text-accent-foreground">
                      {entry.tag}
                    </Link>
                  ))}
                </div>
              ) : null;
            })()}
            <div className="mt-5">
              <TaggedList items={items} base="/notes" />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
