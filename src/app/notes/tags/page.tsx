import { Card } from '@/components/ui/card';
import { TagIndex } from '@/components/content/tags';
import EmptyState from '@/components/ui/empty-state';
import { collectTags, getNotes } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Note tags',
  description: 'Every tag used across Kotree notes — browse by topic.',
  alternates: { canonical: `${site.baseUrl}/notes/tags` },
  ...pageOg('notes', 'Tags across Kotree notes'),
};

export default function NoteTagsPage() {
  const tags = collectTags(getNotes());
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Tags', '/notes/tags')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All notes
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight text-foreground">Note tags</h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">Browse notes by topic.</p>
            <div className="mt-5">
              {tags.length > 0 ? (
                <TagIndex tags={tags} base="/notes" />
              ) : (
                <EmptyState
                  title="No tags yet."
                  hint="Notes get tagged as they are written — this page fills itself."
                />
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
