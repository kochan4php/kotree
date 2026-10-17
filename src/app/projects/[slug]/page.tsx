import { Card } from '@/components/ui/card';
import { formatDate, getProject, getProjects } from '@/lib/content';
import { parseMarkdown, renderMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { breadcrumbLd } from '@/lib/seo';
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

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd(project.title, `/projects/${project.slug}`)),
        }}
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
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <time
                dateTime={project.date}
                className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground"
              >
                {formatDate(project.date)}
              </time>
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border-2 border-foreground bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">{project.title}</h1>

            <article className="mt-1">{renderMarkdown(parseMarkdown(project.body))}</article>

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
          </div>
        </Card>
      </div>
    </main>
  );
}
