import fs from 'fs';
import path from 'path';
import { Card } from '@/components/ui/card';
import CopyVersionLink from '@/components/content/copy-version-link';
import { parseChangelog } from '@/lib/changelog';
import { renderChangelog } from '@/lib/changelog';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { ChevronDown, History, ListTree, Rss } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'All notable changes to Kotree, grouped by version.',
  alternates: { canonical: `${site.baseUrl}/changelog` },
  robots: { index: true, follow: true },
  ...pageOg('changelog', 'Kotree changelog — every update, newest first'),
};

// K25: versions get a plain-number anchor (/changelog#3.3.0) so the "what's
// new" toast and shared links point somewhere stable and human-readable. The
// channel suffix stays in the heading, not in the id.
const versionId = (title: string) =>
  title
    .replace(/[[\]]/g, '')
    .trim()
    .split(/\s+/)[0]
    .replace(/-[a-z][a-z0-9.]*$/i, '');

// The markdown titles are Keep-a-Changelog's `[3.5.0]`; the brackets are link
// syntax, not part of the version, and read as debris in a heading.
const versionLabel = (title: string) => title.replace(/[[\]]/g, '').trim();

function LatestTag() {
  return (
    <span className="shrink-0 rounded border-2 border-foreground bg-accent px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-foreground">
      latest
    </span>
  );
}

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const { header, versions } = renderChangelog(parseChangelog(fs.readFileSync(filePath, 'utf-8')));

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Changelog', '/changelog')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-5xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            {header}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground bg-background px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-foreground shadow-[3px_3px_0_0_var(--foreground)]">
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

        {/* The jump list earns its place below lg too, where twelve versions
            are a long scroll: a native disclosure, no JavaScript. */}
        <details className="group fluid-glass mt-3 rounded-lg lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <ListTree className="h-4 w-4 text-accent-ink" aria-hidden="true" />
              Jump to a version
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 border-t-[3px] border-foreground px-4 py-3">
            {versions.map((version) => (
              <li key={version.title}>
                <a
                  href={`#${versionId(version.title)}`}
                  className="flex min-h-9 items-center justify-between gap-2 font-mono text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                  {versionLabel(version.title)}
                </a>
              </li>
            ))}
          </ul>
        </details>

        <div className="mt-3 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-4">
          {/* Desktop jump list — a panel with a rail, so it reads as navigation
              rather than a loose column of grey numbers on the wallpaper. */}
          <nav
            aria-label="Versions"
            className="hidden lg:sticky lg:top-[calc(4.75rem+env(safe-area-inset-top))] lg:block"
          >
            <div className="fluid-glass rounded-lg p-3">
              <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Versions
              </p>
              <ol className="border-l-2 border-dashed border-foreground/25">
                {versions.map((version) => (
                  <li key={version.title} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[6px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-foreground bg-card"
                    />
                    <a
                      href={`#${versionId(version.title)}`}
                      className="ml-3 flex min-h-8 items-center justify-between gap-2 rounded-md px-2 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <span className="whitespace-nowrap font-mono tracking-tight">
                        {versionLabel(version.title)}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="space-y-3">
            {versions.map((version, i) => (
              <Card
                key={version.title}
                id={versionId(version.title)}
                className="gap-3 fluid-glass neo-press scroll-mt-24"
              >
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-foreground/20 pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="font-mono text-2xl font-black tracking-tight text-foreground">
                        {versionLabel(version.title)}
                      </h2>
                      {i === 0 && <LatestTag />}
                    </div>
                    <CopyVersionLink version={versionId(version.title)} />
                  </div>
                  <div className="mt-4 max-w-[80ch] text-muted-foreground leading-relaxed font-medium">
                    {version.body}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
