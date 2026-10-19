import { Card } from '@/components/ui/card';
import TagChips from '@/components/content/tag-chips';
import PrintButton from '@/components/content/print-button';
import ShelfActions from '@/components/content/shelf-actions';
import HighlightsLayer from '@/components/content/highlights-layer';
import { PrevNext, RelatedList, TableOfContents, tocTimelineScope } from '@/components/content/reading';
import { formatDate, getProject, getProjects, relatedTo } from '@/lib/content';
import { extractHeadings, parseMarkdown, readingMinutes, renderMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { breadcrumbLd, creativeWorkLd } from '@/lib/seo';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: 'Not found' };
  const image = `${site.baseUrl}/og/project-${project.slug}.png`;
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `${site.baseUrl}/projects/${project.slug}` },
    openGraph: { images: [{ url: image, width: 1200, height: 630, alt: project.title }] },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const blocks = parseMarkdown(project.body);
  const headings = extractHeadings(blocks);
  const projects = getProjects();
  const related = relatedTo(project, projects);

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd(project.title, `/projects/${project.slug}`)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkLd(project)) }}
      />
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All projects
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          {/* M30/M36: one h-entry for the whole card; the wrapper also scopes
              the per-heading view-timelines the TOC links consume. */}
          <div className="relative z-10 h-entry" style={tocTimelineScope(headings)}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <time
                dateTime={project.date}
                className="dt-published text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground"
              >
                {formatDate(project.date)}
              </time>
              <span className="text-[10px] font-mono font-bold text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                {readingMinutes(blocks)} min read
              </span>
              {project.updated && (
                <>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Updated {formatDate(project.updated)}
                  </span>
                </>
              )}
              <ShelfActions path={`/projects/${project.slug}`} title={project.title} />
              <PrintButton />
            </div>

            <h1 className="p-name mt-2 text-3xl font-black tracking-tight text-foreground">{project.title}</h1>
            <a className="u-url sr-only" href={`${site.baseUrl}/projects/${project.slug}`}>
              Permalink
            </a>
            <span className="p-author sr-only">{site.name}</span>

            {project.tags.length > 0 && (
              <div className="mt-3">
                <TagChips tags={project.tags} base="/projects" />
              </div>
            )}

            <TableOfContents headings={headings} />
            <article className="mt-1">
              <div className="e-content">{renderMarkdown(blocks)}</div>
            </article>
            <HighlightsLayer path={`/projects/${project.slug}`} title={project.title} />

            {project.links.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3 border-t-[3px] border-foreground pt-5">
                {project.links.map((link) => {
                  const external = /^https?:/i.test(link.url);
                  return (
                    <a
                      key={link.url}
                      href={link.url}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent text-accent-foreground border-[3px] border-foreground px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all min-h-11"
                    >
                      {link.label}
                      {external && <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />}
                    </a>
                  );
                })}
              </div>
            )}

            <RelatedList items={related} base="/projects" />
            <PrevNext items={projects} currentSlug={project.slug} base="/projects" />
          </div>
        </Card>
      </div>
    </main>
  );
}
