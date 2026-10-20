import { Card } from '@/components/ui/card';
import { collectSeries, getNotes } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd } from '@/lib/seo';
import { ArrowLeft, LibraryBig } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Note series',
  description: 'Ordered collections of Kotree notes, with a feed for each.',
  alternates: { canonical: `${site.baseUrl}/notes/series` },
};

export default function SeriesIndexPage() {
  const series = collectSeries(getNotes());
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Note series', '/notes/series')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link href="/notes" className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All notes
        </Link>
        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <LibraryBig className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Note series
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Ordered collections for reading end to end. Each has its own feed.
            </p>
            {series.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No series yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {series.map((entry) => (
                  <li key={entry.slug}>
                    <Link href={`/notes/series/${entry.slug}`} className="neo-press block rounded-lg border-[3px] border-foreground bg-background/80 p-3 shadow-[4px_4px_0_0_var(--foreground)] hover:bg-accent/10">
                      <span className="font-display text-lg font-black text-foreground">{entry.series}</span>
                      <span className="ml-2 text-xs font-mono font-bold text-muted-foreground">{entry.count} notes</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
