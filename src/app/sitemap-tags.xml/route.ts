import { collectTags, getNotes, getProjects } from '@/lib/content';
import { lastModified, sitemapDocument, xmlResponse } from '@/lib/sitemap';
import { site } from '@/lib/site';

// M33: every per-tag page, for notes and projects.
export const dynamic = 'force-static';

export async function GET() {
  const notesChanged = lastModified('content/notes');
  const projectsChanged = lastModified('content/projects');
  return xmlResponse(
    sitemapDocument([
      ...collectTags(getNotes()).map((tag) => ({
        loc: `${site.baseUrl}/notes/tags/${tag.slug}`,
        lastmod: notesChanged,
        changefreq: 'weekly' as const,
        priority: 0.3,
      })),
      ...collectTags(getProjects()).map((tag) => ({
        loc: `${site.baseUrl}/projects/tags/${tag.slug}`,
        lastmod: projectsChanged,
        changefreq: 'weekly' as const,
        priority: 0.3,
      })),
    ])
  );
}
