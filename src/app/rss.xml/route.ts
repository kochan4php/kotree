import { parseChangelog, versionId } from '@/lib/changelog';
import { getNotes } from '@/lib/content';
import { blocksToHtml, rssDocument, versionDate, type RssItem } from '@/lib/feed';
import { weakEtag } from '@/lib/http-cache';
import { parseMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Static at build time: git history exists during the build, not at runtime
export const dynamic = 'force-static';

export async function GET() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = parseChangelog(fs.readFileSync(filePath, 'utf-8'));

  const items: RssItem[] = [];

  changelog.versions.forEach((version) => {
    // Version titles may carry an explicit date ([1.0.0] - 2024-01-01); otherwise use git history
    const dateMatch = version.title.match(/\d{4}-\d{2}-\d{2}/);
    items.push({
      title: version.title,
      link: `${site.baseUrl}/changelog#${versionId(version.title)}`,
      guid: `${site.baseUrl}/changelog#${versionId(version.title)}`,
      date: dateMatch ? new Date(dateMatch[0]) : new Date(versionDate(version.title)),
      html: blocksToHtml(version.blocks),
    });
  });

  // Notes share the stream with changelog entries — one feed of "what's new"
  getNotes().forEach((note) => {
    // K18: tags travel with the feed as categories
    items.push({
      title: `Note: ${note.title}`,
      link: `${site.baseUrl}/notes/${note.slug}`,
      guid: `${site.baseUrl}/notes/${note.slug}`,
      date: new Date(note.date),
      html: blocksToHtml(parseMarkdown(note.body)),
      categories: note.tags,
    });
  });

  // One stream, newest first
  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  // M29: full content in <content:encoded>, plus ETag/Last-Modified so a
  // cache revalidation is a body-less 304
  const { xml, latest } = rssDocument({
    title: `${site.title} — Changelog & Notes`,
    description: `Latest updates and notes from ${site.name}`,
    homeUrl: site.baseUrl,
    selfUrl: `${site.baseUrl}/rss.xml`,
    items,
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
