import { Card } from '@/components/ui/card';
import { TaggedList } from '@/components/content/tags';
import { collectTags, getProjects, slugifyTag } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd, collectionPageLd, pageOg } from '@/lib/seo';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams() {
  return collectTags(getProjects()).map((entry) => ({ tag: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const match = collectTags(getProjects()).find((entry) => entry.slug === tag);
  if (!match) return { title: 'Not found' };
  return {
    title: `Projects tagged ${match.tag}`,
    description: `Kotree projects tagged "${match.tag}".`,
    alternates: { canonical: `${site.baseUrl}/projects/tags/${tag}` },
    ...pageOg(`tag-${tag}`, `Projects tagged ${match.tag}`),
  };
}

export default async function ProjectTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const projects = getProjects();
  const match = collectTags(projects).find((entry) => entry.slug === tag);
  if (!match) notFound();

  const items = projects.filter((project) => project.tags.some((t) => slugifyTag(t) === tag));

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd(`Tag: ${match.tag}`, `/projects/tags/${tag}`)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            collectionPageLd(
              `Projects tagged ${match.tag}`,
              `/projects/tags/${tag}`,
              items.map((project) => ({ title: project.title, url: `${site.baseUrl}/projects/${project.slug}` }))
            )
          ),
        }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/projects/tags"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All tags
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black tracking-tight text-foreground">{match.tag}</h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              {items.length} {items.length === 1 ? 'project' : 'projects'} tagged &quot;{match.tag}&quot;
            </p>
            <div className="mt-5">
              <TaggedList items={items} base="/projects" />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
