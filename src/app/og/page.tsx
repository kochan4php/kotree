import { Card } from '@/components/ui/card';
import { breadcrumbLd } from '@/lib/seo';
import { site } from '@/lib/site';
import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Share cards',
  description: 'Every Open Graph card behind Kotree, in one gallery.',
  alternates: { canonical: `${site.baseUrl}/og` },
  // A gallery of share images adds nothing to search results
  robots: { index: false },
};

interface CardEntry {
  file: string;
  label: string;
  kind: 'home' | 'page' | 'note' | 'project' | 'tag';
}

const KIND_ORDER: CardEntry['kind'][] = ['home', 'page', 'note', 'project', 'tag'];
const KIND_LABELS: Record<CardEntry['kind'], string> = {
  home: 'Home',
  page: 'Pages',
  note: 'Notes',
  project: 'Projects',
  tag: 'Tags',
};

// M32: the manifest is produced by scripts/gen-og.mjs during prebuild.
function readManifest(): CardEntry[] {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'og', 'manifest.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { cards?: CardEntry[] };
    return Array.isArray(parsed.cards) ? parsed.cards : [];
  } catch {
    return [];
  }
}

export default function CardGalleryPage() {
  const cards = readManifest();
  const groups = KIND_ORDER.map((kind) => ({ kind, items: cards.filter((card) => card.kind === kind) })).filter(
    (group) => group.items.length > 0
  );

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Share cards', '/og')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl space-y-3">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight text-foreground">Share cards</h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Every link on this site previews with one of these cards. They are pre-rendered at build time —
              this page is the whole collection, straight from the generator.
            </p>
          </div>
        </Card>

        {groups.length === 0 ? (
          <Card className="fluid-glass">
            <div className="relative z-10">
              <p className="text-muted-foreground font-medium">
                The manifest is missing — run the build (prebuild regenerates the cards and this list).
              </p>
            </div>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.kind} className="fluid-glass">
              <div className="relative z-10">
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  {KIND_LABELS[group.kind]}{' '}
                  <span className="text-xs font-mono font-bold text-muted-foreground">({group.items.length})</span>
                </h2>
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {group.items.map((card) => (
                    <li key={card.file}>
                      {/* Pre-rendered PNGs — the image optimizer adds nothing here */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.file}
                        alt={`Share card: ${card.label}`}
                        width={1200}
                        height={630}
                        loading="lazy"
                        className="w-full rounded-lg border-[3px] border-foreground shadow-[3px_3px_0_0_var(--foreground)]"
                      />
                      <p className="mt-1.5 text-xs font-mono font-bold text-muted-foreground truncate">{card.label}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
