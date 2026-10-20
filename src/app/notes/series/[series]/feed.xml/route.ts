import { collectSeries, getNotes, getSeriesNotes } from '@/lib/content';
import { blocksToHtml, rssDocument } from '@/lib/feed';
import { weakEtag } from '@/lib/http-cache';
import { parseMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';

// A series is a reading order, so its feed keeps the same order rather than
// reverse-chronological dates. Full note content, same as /rss.xml.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return collectSeries(getNotes()).map((entry) => ({ series: entry.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params;
  const notes = getNotes();
  const match = collectSeries(notes).find((entry) => entry.slug === series);
  if (!match) return new NextResponse('Not found', { status: 404 });
  const items = getSeriesNotes(notes, series);

  const { xml, latest } = rssDocument({
    title: `${site.title} — ${match.series}`,
    description: `Kotree notes in the series "${match.series}"`,
    homeUrl: `${site.baseUrl}/notes/series/${series}`,
    selfUrl: `${site.baseUrl}/notes/series/${series}/feed.xml`,
    items: items.map((note) => ({
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
