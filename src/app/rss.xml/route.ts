import { parseChangelog } from '@/lib/changelog';
import { getNotes } from '@/lib/content';
import { parseMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Static at build time: git history exists during the build, not at runtime
export const dynamic = 'force-static';

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Real release date = the commit that first added the version heading.
// Falls back to build time on shallow clones / no git.
function versionDate(title: string): string {
  try {
    const out = execSync(`git log --format=%cI -1 -S "## ${title}" -- CHANGELOG.md`, {
      encoding: 'utf8',
    }).trim();
    if (out) return new Date(out).toUTCString();
  } catch {
    // no git at runtime
  }
  return new Date().toUTCString();
}

// Markdown-lite blocks → simple escaped HTML for the feed body
function blocksToHtml(blocks: { type: string; text?: string; items?: string[] }[]): string {
  let html = '';
  for (const block of blocks) {
    if (block.type === 'p') html += `<p>${escapeXml(block.text ?? '')}</p>`;
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3')
      html += `<h3>${escapeXml(block.text ?? '')}</h3>`;
    if (block.type === 'quote') html += `<blockquote>${escapeXml(block.text ?? '')}</blockquote>`;
    if (block.type === 'list')
      html += `<ul>${(block.items ?? []).map((item) => `<li>${escapeXml(item)}</li>`).join('')}</ul>`;
  }
  return html;
}

export async function GET() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = parseChangelog(fs.readFileSync(filePath, 'utf-8'));

  const items: { date: number; xml: string }[] = [];

  changelog.versions.forEach((version) => {
    const htmlDescription = blocksToHtml(version.blocks);

    // Version titles may carry an explicit date ([1.0.0] - 2024-01-01); otherwise use git history
    const dateMatch = version.title.match(/\d{4}-\d{2}-\d{2}/);
    const pubDate = dateMatch ? new Date(dateMatch[0]).toUTCString() : versionDate(version.title);

    items.push({
      date: new Date(pubDate).getTime(),
      xml: `
      <item>
        <title>${escapeXml(version.title)}</title>
        <link>${escapeXml(site.baseUrl)}/changelog</link>
        <guid>${escapeXml(site.baseUrl)}/changelog#${version.title.replace(/[^a-zA-Z0-9]/g, '-')}</guid>
        <pubDate>${pubDate}</pubDate>
        <description><![CDATA[${htmlDescription}]]></description>
      </item>`,
    });
  });

  // Notes share the stream with changelog entries — one feed of "what's new"
  getNotes().forEach((note) => {
    const pubDate = new Date(note.date).toUTCString();
    // K18: tags travel with the feed as categories
    const categories = note.tags.map((tag) => `\n        <category>${escapeXml(tag)}</category>`).join('');
    items.push({
      date: new Date(pubDate).getTime(),
      xml: `
      <item>
        <title>${escapeXml(`Note: ${note.title}`)}</title>
        <link>${escapeXml(site.baseUrl)}/notes/${note.slug}</link>
        <guid>${escapeXml(site.baseUrl)}/notes/${note.slug}</guid>
        <pubDate>${pubDate}</pubDate>${categories}
        <description><![CDATA[${blocksToHtml(parseMarkdown(note.body))}]]></description>
      </item>`,
    });
  });

  // One stream, newest first
  items.sort((a, b) => b.date - a.date);
  const rssItemsXml = items.map((item) => item.xml).join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>${escapeXml(site.title)} — Changelog &amp; Notes</title>
        <link>${escapeXml(site.baseUrl)}</link>
        <description>Latest updates and notes from ${escapeXml(site.name)}</description>
        <language>en</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${escapeXml(site.baseUrl)}/rss.xml" rel="self" type="application/rss+xml" />
        ${rssItemsXml}
      </channel>
    </rss>`;

  return new NextResponse(rssFeed.trim(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600',
    },
  });
}
