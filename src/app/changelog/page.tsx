import fs from 'fs';
import path from 'path';
import { Card } from '@/components/ui/card';
import { parseChangelog } from '@/lib/changelog';
import { renderChangelog } from '@/lib/changelog';
import { site } from '@/lib/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'All notable changes to Kotree, grouped by version.',
  alternates: { canonical: `${site.baseUrl}/changelog` },
  robots: { index: true, follow: true },
};

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const { header, versions } = renderChangelog(parseChangelog(fs.readFileSync(filePath, 'utf-8')));

  return (
    <main className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2">
      <div className="relative max-w-2xl mx-auto">

        <div className="space-y-6">
          <Card className="fluid-glass mb-6">
            <div className="liquid-gradient"></div>
            <div className="relative z-10">
              {header}
            </div>
          </Card>

          <div className="space-y-6">
            {versions.map((version) => (
              <Card
                key={version.title}
                className="gap-3 transition-all duration-300 fluid-glass hover:border-accent/50 hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-1"
              >
                <div className="relative z-10">
                  <h2 className="text-xl font-black tracking-tight text-accent">{version.title}</h2>
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
