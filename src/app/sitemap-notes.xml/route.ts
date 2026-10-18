import { getNotes } from '@/lib/content';
import { lastModified, sitemapDocument, xmlResponse } from '@/lib/sitemap';
import { site } from '@/lib/site';

// M33: notes with their share cards as image entries.
export const dynamic = 'force-static';

export async function GET() {
  return xmlResponse(
    sitemapDocument(
      getNotes().map((note) => ({
        loc: `${site.baseUrl}/notes/${note.slug}`,
        lastmod: note.date ? new Date(note.date).toISOString() : lastModified('content/notes'),
        changefreq: 'monthly' as const,
        priority: 0.6,
        images: [`${site.baseUrl}/og/note-${note.slug}.png`],
      }))
    )
  );
}
