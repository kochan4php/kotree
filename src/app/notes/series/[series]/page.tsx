import { Card } from '@/components/ui/card';
import { collectSeries, getNotes, getSeriesNotes } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd, collectionPageLd } from '@/lib/seo';
import { ArrowLeft, Rss } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams() {
  return collectSeries(getNotes()).map((entry) => ({ series: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ series: string }> }): Promise<Metadata> {
  const { series } = await params;
  const match = collectSeries(getNotes()).find((entry) => entry.slug === series);
  if (!match) return { title: 'Not found' };
  return {
    title: `${match.series} — a note series`,
    description: `An ordered collection of ${match.count} Kotree notes: ${match.series}.`,
    alternates: { canonical: `${site.baseUrl}/notes/series/${series}` },
    openGraph: { images: [`${site.baseUrl}/og.png`] },
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params;
  const notes = getNotes();
  const match = collectSeries(notes).find((entry) => entry.slug === series);
  if (!match) notFound();
  const items = getSeriesNotes(notes, series);

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd(match.series, `/notes/series/${series}`)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            collectionPageLd(
              match.series,
              `/notes/series/${series}`,
              items.map((note) => ({ title: note.title, url: `${site.baseUrl}/notes/${note.slug}` }))
            )
          ),
        }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link href="/notes/series" className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All series
        </Link>
        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-3xl font-black tracking-tight text-foreground">{match.series}</h1>
              <Link href={`/notes/series/${series}/feed.xml`} className="inline-flex min-h-6 items-center gap-1.5 rounded border-2 border-foreground bg-card px-2 py-1 text-xs font-bold hover:bg-accent hover:text-accent-foreground">
                <Rss className="w-3.5 h-3.5" aria-hidden="true" /> Feed
              </Link>
            </div>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              {match.count} {match.count === 1 ? 'note' : 'notes'}, in reading order.
            </p>
            <ol className="mt-4 flex flex-col gap-3">
              {items.map((note, index) => (
                <li key={note.slug}>
                  <Link href={`/notes/${note.slug}`} className="neo-press block rounded-lg border-[3px] border-foreground bg-background/80 p-3 shadow-[4px_4px_0_0_var(--foreground)] hover:bg-accent/10">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Part {index + 1} · {note.date}
                    </span>
                    <span className="mt-0.5 block font-display text-lg font-black text-foreground">{note.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{note.summary}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              Reading order is fixed; the dates show when each part was published.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
