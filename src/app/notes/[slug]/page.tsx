import { Card } from '@/components/ui/card';
import TagChips from '@/components/content/tag-chips';
import PrintButton from '@/components/content/print-button';
import ShelfActions from '@/components/content/shelf-actions';
import HighlightsLayer from '@/components/content/highlights-layer';
import Reactions from '@/components/content/reactions';
import { PrevNext, RelatedList, TableOfContents, tocTimelineScope } from '@/components/content/reading';
import { formatDate, getNote, getNotes, getSeriesNotes, relatedTo, slugifyTag } from '@/lib/content';
import { extractHeadings, parseMarkdown, readingMinutes, renderMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { blogPostingLd, breadcrumbLd } from '@/lib/seo';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams() {
  return getNotes().map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return { title: 'Not found' };
  const image = `${site.baseUrl}/og/note-${note.slug}.png`;
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `${site.baseUrl}/notes/${note.slug}` },
    openGraph: { images: [{ url: image, width: 1200, height: 630, alt: note.title }] },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  const blocks = parseMarkdown(note.body);
  const headings = extractHeadings(blocks);
  const notes = getNotes();
  const related = relatedTo(note, notes);
  const series = note.series ? getSeriesNotes(notes, slugifyTag(note.series)) : [];
  const seriesIndex = series.findIndex((item) => item.slug === note.slug);

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      {/* How far through the note you are — pure CSS, tracking your own scroll */}
      <div className="kt-reading-progress" aria-hidden="true" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd(note.title, `/notes/${note.slug}`)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd(note)) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/notes"
          className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All notes
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          {/* M30/M36: one h-entry for the whole card; the wrapper also scopes
              the per-heading view-timelines the TOC links consume. */}
          <div className="relative z-10 h-entry" style={tocTimelineScope(headings)}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <time
                dateTime={note.date}
                className="dt-published text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground"
              >
                {formatDate(note.date)}
              </time>
              <span className="text-[10px] font-mono font-bold text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                {readingMinutes(blocks)} min read
              </span>
              {note.updated && (
                <>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Updated {formatDate(note.updated)}
                  </span>
                </>
              )}
              {note.reviewed && (
                <>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Reviewed {formatDate(note.reviewed)}
                  </span>
                </>
              )}
              <ShelfActions path={`/notes/${note.slug}`} title={note.title} />
              <PrintButton />
            </div>
            <h1 className="p-name mt-2 text-3xl font-black tracking-tight text-foreground">{note.title}</h1>
            <a className="u-url sr-only" href={`${site.baseUrl}/notes/${note.slug}`} tabIndex={-1} aria-hidden="true">
              Permalink
            </a>
            <span className="p-author sr-only">{site.name}</span>
            {note.tags.length > 0 && (
              <div className="mt-3">
                <TagChips tags={note.tags} base="/notes" />
              </div>
            )}
            {note.series && series.length > 1 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Part {seriesIndex + 1} of {series.length} in{' '}
                <Link className="font-bold underline decoration-2 underline-offset-2" href={`/notes/series/${slugifyTag(note.series)}`}>
                  {note.series}
                </Link>
              </p>
            )}
            <TableOfContents headings={headings} />
            <article className="mt-1">
              <div className="e-content">{renderMarkdown(blocks)}</div>
            </article>
            <HighlightsLayer path={`/notes/${note.slug}`} title={note.title} />
            <Reactions path={`/notes/${note.slug}`} />
            <RelatedList items={related} base="/notes" />
            <PrevNext items={notes} currentSlug={note.slug} base="/notes" />
          </div>
        </Card>
      </div>
    </main>
  );
}
