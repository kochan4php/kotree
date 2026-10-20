import { getNotes } from '@/lib/content';
import { jsonWithEtag } from '@/lib/http-cache';

// Public, versioned content API: the same metadata the site renders, without
// the body. CORS is open because this is a portfolio, not a private service.
export async function GET(request: Request) {
  const notes = getNotes().map((note) => ({
    slug: note.slug,
    title: note.title,
    date: note.date,
    updated: note.updated,
    reviewed: note.reviewed,
    summary: note.summary,
    tags: note.tags,
    url: `/notes/${note.slug}`,
  }));
  const response = jsonWithEtag(request, { version: 1, notes }, 'public, s-maxage=300, stale-while-revalidate=3600');
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
