import { execSync } from 'child_process';
import type { MarkdownBlock } from './markdown-parse';

// M29: feed plumbing shared by /rss.xml, /feed.json and the per-tag feeds.

export const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Real release date = the commit that first added the version heading.
// Falls back to build time on shallow clones / no git.
export function versionDate(title: string): string {
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

// Markdown-lite blocks → simple escaped HTML for the feed body
export function blocksToHtml(blocks: MarkdownBlock[]): string {
  let html = '';
  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      const tag = block.type;
      html += `<${tag}>${escapeXml(block.text)}</${tag}>`;
    } else if (block.type === 'p') {
      html += `<p>${escapeXml(block.text)}</p>`;
    } else if (block.type === 'quote') {
      html += `<blockquote>${escapeXml(block.text)}</blockquote>`;
    } else if (block.type === 'callout') {
      html += `<p><strong>${escapeXml(block.kind)}:</strong> ${escapeXml(block.text)}</p>`;
    } else if (block.type === 'list') {
      html += `<ul>${block.items.map((item) => `<li>${escapeXml(item)}</li>`).join('')}</ul>`;
    } else if (block.type === 'code') {
      html += `<pre><code>${escapeXml(block.lines.join('\n'))}</code></pre>`;
    } else if (block.type === 'table') {
      const head = block.head.map((cell) => `<th>${escapeXml(cell)}</th>`).join('');
      const rows = block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeXml(cell)}</td>`).join('')}</tr>`).join('');
      html += `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    } else if (block.type === 'footnotes') {
      html += `<section>${block.items.map((item) => `<p>[${escapeXml(item.id)}] ${escapeXml(item.text)}</p>`).join('')}</section>`;
    }
  }
  return html;
}

// Markdown-lite blocks → plain text, which is what JSON Feed consumers want
export function blocksToText(blocks: MarkdownBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'list') return block.items.join('\n');
      if (block.type === 'code') return block.lines.join('\n');
      if (block.type === 'table') return [block.head, ...block.rows].map((row) => row.join(' · ')).join('\n');
      if (block.type === 'footnotes') return block.items.map((item) => `[${item.id}] ${item.text}`).join('\n');
      if (block.type === 'callout') return `${block.kind}: ${block.text}`;
      return block.text;
    })
    .filter(Boolean)
    .join('\n\n');
}

export interface RssItem {
  title: string;
  link: string;
  guid: string;
  date: Date;
  html: string;
  categories?: string[];
}

export interface RssChannel {
  title: string;
  description: string;
  homeUrl: string;
  selfUrl: string;
  items: RssItem[];
}

// M29: full-content RSS — every item carries <content:encoded> (the element
// readers actually use for full posts) next to the classic description.
export function rssDocument(channel: RssChannel): { xml: string; latest: Date } {
  const fallback = new Date();
  const latest = channel.items.reduce((max, item) => (item.date > max ? item.date : max), new Date(0));
  const items = channel.items
    .map(
      (item) => `
      <item>
        <title>${escapeXml(item.title)}</title>
        <link>${escapeXml(item.link)}</link>
        <guid>${escapeXml(item.guid)}</guid>
        <pubDate>${item.date.toUTCString()}</pubDate>${(item.categories ?? [])
        .map((category) => `\n        <category>${escapeXml(category)}</category>`)
        .join('')}
        <description><![CDATA[${item.html}]]></description>
        <content:encoded><![CDATA[${item.html}]]></content:encoded>
      </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
      <channel>
        <title>${escapeXml(channel.title)}</title>
        <link>${escapeXml(channel.homeUrl)}</link>
        <description>${escapeXml(channel.description)}</description>
        <language>en</language>
        <lastBuildDate>${(latest.getTime() ? latest : fallback).toUTCString()}</lastBuildDate>
        <atom:link href="${escapeXml(channel.selfUrl)}" rel="self" type="application/rss+xml" />
        ${items}
      </channel>
    </rss>`;

  return { xml: xml.trim(), latest: latest.getTime() ? latest : fallback };
}
