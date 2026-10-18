import { getProjects } from '@/lib/content';
import { lastModified, sitemapDocument, xmlResponse } from '@/lib/sitemap';
import { site } from '@/lib/site';

// M33: projects with their share cards as image entries.
export const dynamic = 'force-static';

export async function GET() {
  return xmlResponse(
    sitemapDocument(
      getProjects().map((project) => ({
        loc: `${site.baseUrl}/projects/${project.slug}`,
        lastmod: project.date ? new Date(project.date).toISOString() : lastModified('content/projects'),
        changefreq: 'monthly' as const,
        priority: 0.7,
        images: [`${site.baseUrl}/og/project-${project.slug}.png`],
      }))
    )
  );
}
