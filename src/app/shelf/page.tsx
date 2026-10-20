import { Card } from '@/components/ui/card';
import ShelfBoard from '@/components/shelf/shelf-board';
import { site } from '@/lib/site';
import { ArrowLeft, BookMarked } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shelf',
  description: 'Your reading shelf on this device — saved pages, reading progress and highlights. Nothing is uploaded.',
  alternates: { canonical: `${site.baseUrl}/shelf` },
  // Personal and device-local: it belongs in no search index.
  robots: { index: false, follow: true },
};

export default function ShelfPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Home
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <BookMarked className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Shelf
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              What you saved, how far you read and the lines you highlighted — kept in this browser and sent
              nowhere. Clearing the site&rsquo;s data clears the shelf with it.
            </p>
          </div>
        </Card>

        <ShelfBoard />
      </div>
    </main>
  );
}
