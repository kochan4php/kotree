import { parseChangelog } from '@/lib/changelog';
import { getNotes } from '@/lib/content';
import { parseMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// K21: the JSON Feed twin of /rss.xml — same stream (changelog + notes),
// machine-friendlier format. Static at build time: git history exists during
// the build, not at runtime.
export const dynamic = 'force-static';

// Real release date = the commit that first added the version heading.
// Falls back to build time on shallow clones / no git.
function versionDate(title: string): string {
  try {
    const out = execSync(`git log --format=%cI -1 -S "## ${title}" -- CHANGELOG.md`, {
      encoding: 'utf8',
    }).trim();
    if (out) return new Date(out).toISOString();
  } catch {
    // no git at runtime
  }
  return new Date().toISOString();
}

// Markdown-lite blocks → plain text, which is what JSON Feed consumers want
function blocksToText(blocks: { type: string; text?: string; items?: string[] }[]): string {
  return blocks
    .map((block) => (block.type === 'list' ? (block.items ?? []).join('\n') : (block.text ?? '')))
    .filter(Boolean)
    .join('\n\n');
}

export async function GET() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = parseChangelog(fs.readFileSync(filePath, 'utf-8'));

  const items: { date: number; item: object }[] = [];

  changelog.versions.forEach((version) => {
    const dateMatch = version.title.match(/\d{4}-\d{2}-\d{2}/);
    const published = dateMatch ? new Date(dateMatch[0]).toISOString() : versionDate(version.title);
    items.push({
      date: new Date(published).getTime(),
      item: {
        id: `${site.baseUrl}/changelog#${version.title.replace(/[^a-zA-Z0-9]/g, '-')}`,
        url: `${site.baseUrl}/changelog`,
        title: version.title,
        content_text: blocksToText(version.blocks),
        date_published: published,
      },
    });
  });

  // Notes share the stream with changelog entries — one feed of "what's new"
  getNotes().forEach((note) => {
    items.push({
      date: new Date(note.date).getTime(),
      item: {
        id: `${site.baseUrl}/notes/${note.slug}`,
        url: `${site.baseUrl}/notes/${note.slug}`,
        title: `Note: ${note.title}`,
        content_text: blocksToText(parseMarkdown(note.body)),
        date_published: new Date(note.date).toISOString(),
      },
    });
  });

  items.sort((a, b) => b.date - a.date);

  return NextResponse.json(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: `${site.title} — Changelog & Notes`,
      home_page_url: site.baseUrl,
      feed_url: `${site.baseUrl}/feed.json`,
      language: 'en',
      authors: [{ name: site.name, url: site.baseUrl }],
      items: items.map((entry) => entry.item),
    },
    { headers: { 'Content-Type': 'application/feed+json' } }
  );
}
