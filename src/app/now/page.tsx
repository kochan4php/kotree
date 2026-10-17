import { Card } from '@/components/ui/card';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Now',
  description: 'A snapshot of what Deo Subarno is focused on right now — projects, experiments and open doors.',
  alternates: { canonical: `${site.baseUrl}/now` },
  ...pageOg('now', 'Now — what Deo Subarno is up to right now'),
};

export default function NowPage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Now', '/now')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <Sparkles className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Now
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              A snapshot of what I&apos;m focused on at the moment — not a feed, just the current state of things.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-foreground/90 leading-relaxed font-medium list-disc marker:text-accent pl-5">
              <li>Sharpening Kotree: performance, offline support and the little secrets tucked around the site.</li>
              <li>Sketching small game prototypes in the evenings.</li>
              <li>Exploring new corners of TypeScript and web platform APIs.</li>
              <li>Open to interesting web and game projects — the contact links on the home page all work.</li>
            </ul>
            <p className="mt-5 text-xs font-mono font-bold text-muted-foreground">
              Updated October 2026 · <Link href="/about" className="text-accent-ink hover:underline underline-offset-2">More about me</Link> ·{' '}
              <Link href="/projects" className="text-accent-ink hover:underline underline-offset-2">What I&apos;ve built</Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
