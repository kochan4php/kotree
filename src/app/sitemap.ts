import type { MetadataRoute } from 'next';
import { execSync } from 'child_process';
import { collectTags, getNotes, getProjects } from '@/lib/content';
import { site } from '@/lib/site';

// Real last-modified dates from git (falls back to build time on shallow clones)
function lastModified(file?: string): string {
  try {
    const out = execSync(`git log -1 --format=%cI ${file ? `-- ${file}` : ''}`, {
      encoding: 'utf8',
    }).trim();
    if (out) return out;
  } catch {
    // shallow clone or no git — build time is the best we have
  }
  return new Date().toISOString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const og = (name: string) => [`${site.baseUrl}/og/${name}.png`];
  return [
    {
      url: site.baseUrl,
      lastModified: lastModified(),
      changeFrequency: 'weekly',
      priority: 1,
      images: [`${site.baseUrl}/og.png`],
    },
    {
      url: `${site.baseUrl}/projects`,
      lastModified: lastModified(),
      changeFrequency: 'monthly',
      priority: 0.8,
      images: og('projects'),
    },
    {
      url: `${site.baseUrl}/notes`,
      lastModified: lastModified(),
      changeFrequency: 'weekly',
      priority: 0.8,
      images: og('notes'),
    },
    {
      url: `${site.baseUrl}/about`,
      lastModified: lastModified('src/app/about/page.tsx'),
      changeFrequency: 'monthly',
      priority: 0.7,
      images: og('about'),
    },
    {
      url: `${site.baseUrl}/now`,
      lastModified: lastModified('src/app/now/page.tsx'),
      changeFrequency: 'monthly',
      priority: 0.6,
      images: og('now'),
    },
    {
      url: `${site.baseUrl}/guestbook`,
      lastModified: lastModified('src/app/guestbook/page.tsx'),
      changeFrequency: 'daily',
      priority: 0.6,
      images: og('guestbook'),
    },
    {
      url: `${site.baseUrl}/changelog`,
      lastModified: lastModified('CHANGELOG.md'),
      changeFrequency: 'monthly',
      priority: 0.5,
      images: og('changelog'),
    },
    {
      url: `${site.baseUrl}/secrets`,
      lastModified: lastModified('src/lib/secrets.ts'),
      changeFrequency: 'monthly',
      priority: 0.5,
      images: og('secrets'),
    },
    {
      url: `${site.baseUrl}/stats`,
      lastModified: lastModified('src/app/stats/page.tsx'),
      changeFrequency: 'daily',
      priority: 0.5,
      images: og('stats'),
    },
    {
      url: `${site.baseUrl}/wrapped`,
      lastModified: lastModified('src/app/wrapped/page.tsx'),
      changeFrequency: 'weekly',
      priority: 0.5,
      images: og('wrapped'),
    },
    {
      url: `${site.baseUrl}/privacy`,
      lastModified: lastModified('src/app/privacy/page.tsx'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${site.baseUrl}/accessibility`,
      lastModified: lastModified('src/app/accessibility/page.tsx'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...getProjects().map((project) => ({
      url: `${site.baseUrl}/projects/${project.slug}`,
      lastModified: project.date ? new Date(project.date).toISOString() : lastModified(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      images: og(`project-${project.slug}`),
    })),
    ...getNotes().map((note) => ({
      url: `${site.baseUrl}/notes/${note.slug}`,
      lastModified: note.date ? new Date(note.date).toISOString() : lastModified(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      images: og(`note-${note.slug}`),
    })),
    // K18: tag indexes and their per-tag pages
    {
      url: `${site.baseUrl}/notes/tags`,
      lastModified: lastModified('content/notes'),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    },
    ...collectTags(getNotes()).map((tag) => ({
      url: `${site.baseUrl}/notes/tags/${tag.slug}`,
      lastModified: lastModified('content/notes'),
      changeFrequency: 'weekly' as const,
      priority: 0.3,
    })),
    {
      url: `${site.baseUrl}/projects/tags`,
      lastModified: lastModified('content/projects'),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    },
    ...collectTags(getProjects()).map((tag) => ({
      url: `${site.baseUrl}/projects/tags/${tag.slug}`,
      lastModified: lastModified('content/projects'),
      changeFrequency: 'weekly' as const,
      priority: 0.3,
    })),
  ];
}
