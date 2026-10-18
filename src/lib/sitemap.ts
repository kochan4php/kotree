import { execSync } from 'child_process';
import { NextResponse } from 'next/server';
import { weakEtag } from './http-cache';

// M33: hand-built sitemaps. The index lists four sub-sitemaps so notes and
// projects can carry image entries — Next's MetadataRoute.Sitemap has no way
// to express <image:image>.

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  images?: string[];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function sitemapDocument(urls: SitemapUrl[]): string {
  const hasImages = urls.some((url) => (url.images?.length ?? 0) > 0);
  const entries = urls
    .map((url) => {
      const images = (url.images ?? [])
        .map((image) => `\n    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`)
        .join('');
      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}${
        url.changefreq ? `\n    <changefreq>${url.changefreq}</changefreq>` : ''
      }${typeof url.priority === 'number' ? `\n    <priority>${url.priority.toFixed(1)}</priority>` : ''}${images}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${
    hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''
  }>
${entries}
</urlset>`;
}

export function sitemapIndexDocument(sitemaps: { loc: string; lastmod?: string }[]): string {
  const entries = sitemaps
    .map(
      (sitemap) =>
        `  <sitemap>\n    <loc>${escapeXml(sitemap.loc)}</loc>${
          sitemap.lastmod ? `\n    <lastmod>${sitemap.lastmod}</lastmod>` : ''
        }\n  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

// Real last-modified dates from git (falls back to build time on shallow clones)
export function lastModified(file?: string): string {
  try {
    const out = execSync(`git log -1 --format=%cI ${file ? `-- ${file}` : ''}`, {
      encoding: 'utf8',
    }).trim();
    if (out) return out;
  } catch {
    // shallow clone or no git — build time is the best we have
  }
  return new Date().toISOString();
}

// Static XML with the same caching contract the feeds use.
export function xmlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      ETag: weakEtag(xml),
    },
  });
}
