import { Card } from '@/components/ui/card';
import { formatDate, getProjects } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { ArrowRight, FolderGit2 } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Case studies and side projects by Deo Subarno — what was built, how and why.',
  alternates: { canonical: `${site.baseUrl}/projects` },
  ...pageOg('projects', 'Projects and case studies by Deo Subarno'),
};

export default function ProjectsPage() {
  const projects = getProjects();

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Projects', '/projects')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <FolderGit2 className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Projects
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Things I&apos;ve built, with the story behind each one. Longer than a link, shorter than a novel.
            </p>
          </div>
        </Card>

        <ul className="mt-3 space-y-3">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={`/projects/${project.slug}`} className="group block">
                <Card data-reveal className="fluid-glass neo-press">
                  <div className="liquid-gradient"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl font-black tracking-tight text-foreground group-hover:text-accent-ink transition-colors">
                        {project.title}
                      </h2>
                      <ArrowRight
                        className="w-4 h-4 mt-1 shrink-0 text-accent-ink group-hover:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{project.summary}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border-2 border-foreground bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      <time
                        dateTime={project.date}
                        className="ml-auto text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {formatDate(project.date)}
                      </time>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
