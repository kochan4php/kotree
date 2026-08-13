import { parseChangelog } from '@/lib/changelog';
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

export async function GET() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = parseChangelog(fs.readFileSync(filePath, 'utf-8'));
  
  let rssItemsXml = '';
  changelog.versions.forEach((version) => {
    let htmlDescription = '';
    version.blocks.forEach(block => {
      if (block.type === 'p') htmlDescription += `<p>${escapeXml(block.text)}</p>`;
      if (block.type === 'h3') htmlDescription += `<h3>${escapeXml(block.text)}</h3>`;
      if (block.type === 'list') htmlDescription += `<ul>${block.items.map(i => `<li>${escapeXml(i)}</li>`).join('')}</ul>`;
    });
    
    // Version titles may carry an explicit date ([1.0.0] - 2024-01-01); otherwise use git history
    const dateMatch = version.title.match(/\d{4}-\d{2}-\d{2}/);
    const pubDate = dateMatch ? new Date(dateMatch[0]).toUTCString() : versionDate(version.title);

    rssItemsXml += `
      <item>
        <title>${escapeXml(version.title)}</title>
        <link>${escapeXml(site.baseUrl)}/changelog</link>
        <guid>${escapeXml(site.baseUrl)}/changelog#${version.title.replace(/[^a-zA-Z0-9]/g, '-')}</guid>
        <pubDate>${pubDate}</pubDate>
        <description><![CDATA[${htmlDescription}]]></description>
      </item>`;
  });

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>${escapeXml(site.title)} Changelog</title>
        <link>${escapeXml(site.baseUrl)}</link>
        <description>Latest updates and changes to ${escapeXml(site.name)}'s portfolio</description>
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
