import { Card } from '@/components/ui/card';
import { TagIndex } from '@/components/content/tags';
import EmptyState from '@/components/ui/empty-state';
import { collectTags, getProjects } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project tags',
  description: 'Every tag used across Kotree projects — browse by topic.',
  alternates: { canonical: `${site.baseUrl}/projects/tags` },
  ...pageOg('projects', 'Tags across Kotree projects'),
};

export default function ProjectTagsPage() {
  const tags = collectTags(getProjects());
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Tags', '/projects/tags')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/projects"
          className="inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All projects
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight text-foreground">Project tags</h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">Browse projects by topic.</p>
            <div className="mt-5">
              {tags.length > 0 ? (
                <TagIndex tags={tags} base="/projects" />
              ) : (
                <EmptyState title="No tags yet." hint="Projects get tagged as they land — this page fills itself." />
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
