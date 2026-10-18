// Pre-renders the social share images at build time (public/og.png for the
// home page, public/og/<name>.png per page/project/note/tag, plus the
// /og gallery manifest — M32).
// Replaces the old runtime /api/og route (satori + Mongo per request,
// which 500'd in production when it couldn't reach Google Fonts).
// Fonts are committed locally so this never touches the network.
import { ImageResponse } from 'next/og.js';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bold = fs.readFileSync(path.join(__dirname, 'fonts', 'inter-bold.ttf'));
const extrabold = fs.readFileSync(path.join(__dirname, 'fonts', 'inter-extrabold.ttf'));
const archivoBlack = fs.readFileSync(path.join(__dirname, 'fonts', 'ArchivoBlack-Regular.ttf'));

const div = (children, style) => React.createElement('div', { style }, children);

const fonts = [
  { name: 'Archivo Black', data: archivoBlack, weight: 400, style: 'normal' },
  { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  { name: 'Inter', data: extrabold, weight: 800, style: 'normal' },
];

async function render(title, subtitle, footer) {
  const content = div(
    [
      div(title, {
        fontSize: title.length > 24 ? 76 : title.length > 14 ? 96 : 120,
        fontFamily: 'Archivo Black',
        fontWeight: 400,
        color: '#14110f',
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        textAlign: 'center',
        maxWidth: '86%',
        textShadow: '8px 8px 0 #ff7c47',
      }),
      div(subtitle, {
        fontSize: 40,
        color: '#6f6257',
        marginTop: 24,
        textAlign: 'center',
        maxWidth: '80%',
        fontWeight: 700,
      }),
      div(footer, {
        fontSize: 32,
        color: '#a08a76',
        marginTop: 24,
      }),
    ],
    {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff7e9',
      backgroundImage:
        'linear-gradient(135deg, rgba(255,217,61,0.35) 0%, rgba(255,144,232,0.25) 50%, rgba(76,201,240,0.3) 100%)',
    }
  );
  const img = await new ImageResponse(content, { width: 1200, height: 630, fonts });
  return Buffer.from(await img.arrayBuffer());
}

// M32: every card is recorded so /og can show the whole gallery
const cards = [];
function writeImage(relPath, buffer, label, kind) {
  const out = path.join(__dirname, '..', 'public', relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buffer);
  if (label) cards.push({ file: `/${relPath}`, label, kind });
  console.log(`${relPath} generated: ${buffer.length} bytes`);
}

// Home keeps its classic card at /og.png (root metadata already points there)
writeImage(
  'og.png',
  await render(
    'Kotree',
    'All social links of Deo Subarno (Kochan) — Software & Game Developer',
    'Deo Subarno • Software and Game Developer'
  ),
  'Kotree',
  'home'
);

// One card per static page; pages advertise them via lib/seo pageOg()
const pages = [
  ['changelog', 'Changelog', 'Every update, newest first'],
  ['secrets', 'Secrets', 'Eleven easter eggs are hidden in Kotree'],
  ['about', 'About', 'Who is behind Kotree'],
  ['now', 'Now', 'What I am up to right now'],
  ['projects', 'Projects', 'Things I have built'],
  ['notes', 'Notes', 'Short notes, newest first'],
  ['guestbook', 'Guestbook', 'The full confession wall'],
  ['stats', 'Stats', 'Clicks, links and reactions'],
  ['wrapped', 'Wrapped', 'The year in clicks and secrets'],
  ['accessibility', 'Accessibility', 'How Kotree is built to be usable'],
  ['uses', 'Uses', 'What this site runs on'],
  ['links', 'Links', 'Resources this site leans on'],
];
for (const [name, title, subtitle] of pages) {
  writeImage(`og/${name}.png`, await render(title, subtitle, 'Deo Subarno • Kotree'), title, 'page');
}

// Per-project and per-note cards, straight from the content folders
function frontmatter(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  const data = {};
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      const head = raw.slice(raw.indexOf('\n', 3), end);
      for (const line of head.split('\n')) {
        const i = line.indexOf(':');
        if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
  }
  return data;
}

const contentDir = path.join(__dirname, '..', 'content');
for (const [dir, prefix] of [
  ['projects', 'project'],
  ['notes', 'note'],
]) {
  const full = path.join(contentDir, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full).filter((name) => name.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    const data = frontmatter(path.join(full, f));
    const title = data.title ?? slug;
    const summary = data.summary ?? '';
    const subtitle = summary.length > 120 ? `${summary.slice(0, 117)}…` : summary;
    writeImage(`og/${prefix}-${slug}.png`, await render(title, subtitle, 'Deo Subarno • Kotree'), title, prefix);
  }
}

// M32: one card per tag, shared by the notes and projects tag pages.
// The slug mirrors slugifyTag() in src/lib/content.ts.
const tagSlug = (tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const tags = new Map();
for (const dir of ['projects', 'notes']) {
  const full = path.join(contentDir, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full).filter((name) => name.endsWith('.md'))) {
    const data = frontmatter(path.join(full, f));
    for (const tag of (data.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)) {
      const slug = tagSlug(tag);
      if (slug && !tags.has(slug)) tags.set(slug, tag);
    }
  }
}
for (const [slug, tag] of tags) {
  writeImage(
    `og/tag-${slug}.png`,
    await render(`#${tag}`, `Notes and projects tagged “${tag}”`, 'Deo Subarno • Kotree'),
    `Tagged “${tag}”`,
    'tag'
  );
}

// M32: the /og gallery reads this manifest at build time
fs.mkdirSync(path.join(__dirname, '..', 'public', 'og'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'og', 'manifest.json'),
  JSON.stringify({ cards }, null, 2) + '\n'
);
console.log(`og/manifest.json written: ${cards.length} cards`);
