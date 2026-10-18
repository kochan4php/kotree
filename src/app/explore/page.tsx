import { Card } from '@/components/ui/card';
import { site } from '@/lib/site';
import { breadcrumbLd } from '@/lib/seo';
import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import ExploreMap from './explore-map';

export const metadata: Metadata = {
  title: 'Explore',
  description: 'A visual map of Kotree — every page, and the secrets still hiding on each.',
  alternates: { canonical: `${site.baseUrl}/explore` },
  robots: { index: true, follow: true },
};

export default function ExplorePage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Explore', '/explore')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <Compass className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Explore
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              The whole site as one map — walk the line, and see which secrets you have already uncovered at each
              stop.
            </p>
          </div>
        </Card>

        <div className="mt-3">
          <Card className="gap-4 fluid-glass">
            <div className="liquid-gradient"></div>
            <div className="relative z-10">
              <ExploreMap />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
