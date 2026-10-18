import { Card } from '@/components/ui/card';
import { resources } from '@/data/links';
import { pageOg } from '@/lib/seo';
import { site } from '@/lib/site';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Links',
  description: 'Resources Kotree leans on, and a short tour of the site itself.',
  alternates: { canonical: `${site.baseUrl}/links` },
  ...pageOg('links', 'Links — resources Kotree leans on'),
};

// Internal tour: same-site links, plain anchors so the feed and gallery
// routes open directly.
const around = [
  ['Now', '/now', 'What I am up to right now'],
  ['Uses', '/uses', 'What this site runs on'],
  ['Changelog', '/changelog', 'Every update, newest first'],
  ['Share-card gallery', '/og', 'The cards behind every link preview'],
  ['RSS feed', '/rss.xml', 'Changelog and notes as a feed'],
  ['JSON Feed', '/feed.json', 'The same stream, machine-friendly'],
] as const;

export default function LinksPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl space-y-3">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <BookOpen className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Links
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              The public references this site leans on, plus a short tour of everything else here.
            </p>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Resources</h2>
            <ul className="mt-3 space-y-3">
              {resources.map((item) => (
                <li key={item.url} className="text-sm leading-relaxed">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-accent-ink underline underline-offset-2 decoration-2 hover:decoration-[3px]"
                  >
                    {item.name}
                  </a>
                  <span className="text-muted-foreground"> — {item.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Around this site</h2>
            <ul className="mt-3 space-y-3">
              {around.map(([label, href, note]) => (
                <li key={href} className="text-sm leading-relaxed">
                  <a
                    href={href}
                    className="font-bold text-accent-ink underline underline-offset-2 decoration-2 hover:decoration-[3px]"
                  >
                    {label}
                  </a>
                  <span className="text-muted-foreground"> — {note}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </main>
  );
}
