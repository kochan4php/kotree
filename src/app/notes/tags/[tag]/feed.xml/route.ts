import { collectTags, getNotes, slugifyTag } from '@/lib/content';
import { blocksToHtml, rssDocument } from '@/lib/feed';
import { weakEtag } from '@/lib/http-cache';
import { parseMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';

// M29: one feed per tag — full note content, same shape as /rss.xml, so a
// reader can subscribe to #pwa and nothing else.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return collectTags(getNotes()).map((entry) => ({ tag: entry.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const match = collectTags(getNotes()).find((entry) => entry.slug === tag);
  if (!match) return new NextResponse('Not found', { status: 404 });

  const notes = getNotes()
    .filter((note) => note.tags.some((t) => slugifyTag(t) === tag))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const { xml, latest } = rssDocument({
    title: `${site.title} — Notes tagged ${match.tag}`,
    description: `Kotree notes tagged "${match.tag}"`,
    homeUrl: `${site.baseUrl}/notes/tags/${tag}`,
    selfUrl: `${site.baseUrl}/notes/tags/${tag}/feed.xml`,
    items: notes.map((note) => ({
      title: note.title,
      link: `${site.baseUrl}/notes/${note.slug}`,
      guid: `${site.baseUrl}/notes/${note.slug}`,
      date: new Date(note.date),
      html: blocksToHtml(parseMarkdown(note.body)),
      categories: note.tags,
    })),
  });

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600',
      ETag: weakEtag(xml),
      'Last-Modified': latest.toUTCString(),
    },
  });
}
