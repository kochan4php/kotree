import { parseChangelog } from '@/lib/changelog';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = parseChangelog(fs.readFileSync(filePath, 'utf-8'));
  
  let rssItemsXml = '';
  changelog.versions.forEach((version) => {
    let htmlDescription = '';
    version.blocks.forEach(block => {
      if (block.type === 'p') htmlDescription += `<p>${block.text}</p>`;
      if (block.type === 'h3') htmlDescription += `<h3>${block.text}</h3>`;
      if (block.type === 'list') htmlDescription += `<ul>${block.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    });
    
    // Extract a mock date from the version string if possible (e.g., [1.0.0] - 2024-01-01)
    // Or default to current date
    const dateMatch = version.title.match(/\d{4}-\d{2}-\d{2}/);
    const pubDate = dateMatch ? new Date(dateMatch[0]).toUTCString() : new Date().toUTCString();

    rssItemsXml += `
      <item>
        <title>${version.title}</title>
        <link>${site.baseUrl}/changelog</link>
        <guid>${site.baseUrl}/changelog#${version.title.replace(/[^a-zA-Z0-9]/g, '-')}</guid>
        <pubDate>${pubDate}</pubDate>
        <description><![CDATA[${htmlDescription}]]></description>
      </item>`;
  });

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>${site.title} Changelog</title>
        <link>${site.baseUrl}</link>
        <description>Latest updates and changes to ${site.name}'s portfolio</description>
        <language>en</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${site.baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
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
