import fs from 'fs';
import path from 'path';
import { Card } from '@/components/ui/card';
import { parseChangelog } from '@/lib/changelog';
import { renderChangelog } from '@/lib/changelog';
import { site } from '@/lib/site';
import { History, Rss } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'All notable changes to Kotree, grouped by version.',
  alternates: { canonical: `${site.baseUrl}/changelog` },
  robots: { index: true, follow: true },
};

const slugify = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const { header, versions } = renderChangelog(parseChangelog(fs.readFileSync(filePath, 'utf-8')));

  return (
    <main className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2">
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-5xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            {header}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground bg-foreground px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-background shadow-[3px_3px_0_0_var(--foreground)]">
                <History className="w-3.5 h-3.5" aria-hidden="true" />
                {versions.length} releases
              </span>
              <a
                href="/rss.xml"
                className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground bg-accent px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-accent-foreground shadow-[3px_3px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)]"
              >
                <Rss className="w-3.5 h-3.5" aria-hidden="true" />
                RSS feed
              </a>
            </div>
          </div>
        </Card>

        <div className="mt-3 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-3">
          {/* Desktop jump list — sticks beside the versions while you read */}
          <nav aria-label="Versions" className="hidden lg:sticky lg:top-24 lg:block">
            <ul className="space-y-1">
              {versions.map((version, i) => (
                <li key={version.title}>
                  <a
                    href={`#v${slugify(version.title)}`}
                    className="flex items-center justify-between gap-2 rounded-lg border-2 border-transparent px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <span className="font-mono tracking-tight">{version.title.replace(/[[\]]/g, '')}</span>
                    {i === 0 && (
                      <span className="rounded border-2 border-foreground bg-accent px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-foreground">
                        latest
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3">
            {versions.map((version) => (
              <Card
                key={version.title}
                id={`v${slugify(version.title)}`}
                className="gap-3 fluid-glass neo-press scroll-mt-24"
              >
                <div className="relative z-10 max-w-[65ch]">
                  <h2 className="text-2xl font-black tracking-tight text-accent-ink">{version.title}</h2>
                  <div className="text-muted-foreground leading-relaxed font-medium">{version.body}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
