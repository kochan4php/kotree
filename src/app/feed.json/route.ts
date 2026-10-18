import { parseChangelog } from '@/lib/changelog';
import { getNotes } from '@/lib/content';
import { blocksToHtml, blocksToText, versionDate } from '@/lib/feed';
import { weakEtag } from '@/lib/http-cache';
import { parseMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// K21: the JSON Feed twin of /rss.xml — same stream (changelog + notes),
// machine-friendlier format. Static at build time: git history exists during
// the build, not at runtime.
export const dynamic = 'force-static';

interface JsonItem {
  date: number;
  item: Record<string, unknown>;
}

export async function GET() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = parseChangelog(fs.readFileSync(filePath, 'utf-8'));

  const items: JsonItem[] = [];

  changelog.versions.forEach((version) => {
    const dateMatch = version.title.match(/\d{4}-\d{2}-\d{2}/);
    const published = dateMatch ? new Date(dateMatch[0]).toISOString() : versionDate(version.title);
    items.push({
      date: new Date(published).getTime(),
      item: {
        id: `${site.baseUrl}/changelog#${version.title.replace(/[^a-zA-Z0-9]/g, '-')}`,
        url: `${site.baseUrl}/changelog`,
        title: version.title,
        content_html: blocksToHtml(version.blocks),
        content_text: blocksToText(version.blocks),
        date_published: published,
      },
    });
  });

  // Notes share the stream with changelog entries — one feed of "what's new"
  getNotes().forEach((note) => {
    const blocks = parseMarkdown(note.body);
    items.push({
      date: new Date(note.date).getTime(),
      item: {
        id: `${site.baseUrl}/notes/${note.slug}`,
        url: `${site.baseUrl}/notes/${note.slug}`,
        title: `Note: ${note.title}`,
        // M29: 1.1 completeness — both content types, modified date, tags
        content_html: blocksToHtml(blocks),
        content_text: blocksToText(blocks),
        date_published: new Date(note.date).toISOString(),
        ...(note.updated ? { date_modified: new Date(note.updated).toISOString() } : {}),
        ...(note.tags.length > 0 ? { tags: note.tags } : {}),
      },
    });
  });

  items.sort((a, b) => b.date - a.date);
  const latest = new Date(items[0]?.date ?? Date.now());

  const body = JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: `${site.title} — Changelog & Notes`,
      home_page_url: site.baseUrl,
      feed_url: `${site.baseUrl}/feed.json`,
      language: 'en',
      icon: `${site.baseUrl}/icons/icon-192x192.png`,
      favicon: `${site.baseUrl}/favicon.ico`,
      authors: [{ name: site.name, url: site.baseUrl }],
      items: items.map((entry) => entry.item),
    },
    null,
    2
  );

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600',
      ETag: weakEtag(body),
      'Last-Modified': latest.toUTCString(),
    },
  });
}
