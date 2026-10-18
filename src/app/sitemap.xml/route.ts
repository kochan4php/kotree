import { lastModified, sitemapIndexDocument, xmlResponse } from '@/lib/sitemap';
import { site } from '@/lib/site';

// M33: the sitemap index — four sub-sitemaps so notes and projects can carry
// <image:image> entries (which Next's MetadataRoute cannot express).
export const dynamic = 'force-static';

export async function GET() {
  return xmlResponse(
    sitemapIndexDocument([
      { loc: `${site.baseUrl}/sitemap-pages.xml`, lastmod: lastModified() },
      { loc: `${site.baseUrl}/sitemap-notes.xml`, lastmod: lastModified('content/notes') },
      { loc: `${site.baseUrl}/sitemap-projects.xml`, lastmod: lastModified('content/projects') },
      { loc: `${site.baseUrl}/sitemap-tags.xml`, lastmod: lastModified('content/notes') },
    ])
  );
}
