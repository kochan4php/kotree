import { lastModified, sitemapDocument, xmlResponse } from '@/lib/sitemap';
import { site } from '@/lib/site';

// M33: static pages. Notes, projects and tag pages live in their own
// sub-sitemaps so they can carry image entries.
export const dynamic = 'force-static';

export async function GET() {
  const og = (name: string) => [`${site.baseUrl}/og/${name}.png`];
  return xmlResponse(
    sitemapDocument([
      { loc: site.baseUrl, lastmod: lastModified(), changefreq: 'weekly', priority: 1, images: [`${site.baseUrl}/og.png`] },
      { loc: `${site.baseUrl}/projects`, lastmod: lastModified(), changefreq: 'monthly', priority: 0.8, images: og('projects') },
      { loc: `${site.baseUrl}/notes`, lastmod: lastModified(), changefreq: 'weekly', priority: 0.8, images: og('notes') },
      { loc: `${site.baseUrl}/about`, lastmod: lastModified('src/app/about/page.tsx'), changefreq: 'monthly', priority: 0.7, images: og('about') },
      { loc: `${site.baseUrl}/now`, lastmod: lastModified('src/app/now/page.tsx'), changefreq: 'monthly', priority: 0.6, images: og('now') },
      { loc: `${site.baseUrl}/guestbook`, lastmod: lastModified('src/app/guestbook/page.tsx'), changefreq: 'daily', priority: 0.6, images: og('guestbook') },
      { loc: `${site.baseUrl}/changelog`, lastmod: lastModified('CHANGELOG.md'), changefreq: 'monthly', priority: 0.5, images: og('changelog') },
      { loc: `${site.baseUrl}/secrets`, lastmod: lastModified('src/lib/secrets.ts'), changefreq: 'monthly', priority: 0.5, images: og('secrets') },
      // M51: the visual sitemap
      { loc: `${site.baseUrl}/explore`, lastmod: lastModified('src/app/explore/page.tsx'), changefreq: 'monthly', priority: 0.4 },
      { loc: `${site.baseUrl}/stats`, lastmod: lastModified('src/app/stats/page.tsx'), changefreq: 'daily', priority: 0.5, images: og('stats') },
      { loc: `${site.baseUrl}/wrapped`, lastmod: lastModified('src/app/wrapped/page.tsx'), changefreq: 'weekly', priority: 0.5, images: og('wrapped') },
      // M34: the two new reference pages
      { loc: `${site.baseUrl}/uses`, lastmod: lastModified('src/app/uses/page.tsx'), changefreq: 'monthly', priority: 0.5, images: og('uses') },
      { loc: `${site.baseUrl}/links`, lastmod: lastModified('src/app/links/page.tsx'), changefreq: 'monthly', priority: 0.5, images: og('links') },
      { loc: `${site.baseUrl}/privacy`, lastmod: lastModified('src/app/privacy/page.tsx'), changefreq: 'yearly', priority: 0.3 },
      { loc: `${site.baseUrl}/accessibility`, lastmod: lastModified('src/app/accessibility/page.tsx'), changefreq: 'yearly', priority: 0.3 },
      { loc: `${site.baseUrl}/notes/tags`, lastmod: lastModified('content/notes'), changefreq: 'weekly', priority: 0.4 },
      { loc: `${site.baseUrl}/projects/tags`, lastmod: lastModified('content/projects'), changefreq: 'weekly', priority: 0.4 },
    ])
  );
}
