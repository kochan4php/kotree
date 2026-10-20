import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getNotes, getProjects, slugifyTag } from '../../src/lib/content.ts';
import { parseMarkdown, safeHref, slugifyHeading, type MarkdownBlock } from '../../src/lib/markdown-parse.ts';

// Every in-page link is authored in this repo, so a dead one is a bug we can
// catch before deploy. External URLs are left to their owners.

const root = process.cwd();
const notes = getNotes();
const projects = getProjects();

// Static pages, with route groups removed and dynamic pages left to the
// content-aware checks below.
function pageRoutes(dir: string, prefix = ''): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      if (entry.name === 'page.tsx' && !prefix.includes('[')) routes.push(prefix || '/');
      continue;
    }
    if (entry.name.startsWith('@')) continue;
    const segment = entry.name.startsWith('(') && entry.name.endsWith(')') ? '' : `/${entry.name}`;
    routes.push(...pageRoutes(path.join(dir, entry.name), `${prefix}${segment}`));
  }
  return routes;
}

const staticRoutes = new Set(pageRoutes(path.join(root, 'src', 'app')));
const noteTags = new Set(notes.flatMap((note) => note.tags.map(slugifyTag)));
const projectTags = new Set(projects.flatMap((project) => project.tags.map(slugifyTag)));

function headingIds(blocks: MarkdownBlock[]): Set<string> {
  const seen = new Map<string, number>();
  const ids = new Set<string>();
  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      ids.add(slugifyHeading(block.text, seen));
    }
  }
  return ids;
}

function texts(blocks: MarkdownBlock[]): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') out.push(block.text);
    else if (block.type === 'p' || block.type === 'quote') out.push(block.text);
    else if (block.type === 'callout') out.push(block.text);
    else if (block.type === 'list') out.push(...block.items);
    else if (block.type === 'table') out.push(...block.head, ...block.rows.flat());
    else if (block.type === 'footnotes') out.push(...block.items.map((item) => item.text));
  }
  return out;
}

const docs = [
  ...notes.map((note) => ({ path: `/notes/${note.slug}`, slug: note.slug, blocks: parseMarkdown(note.body) })),
  ...projects.map((project) => ({
    path: `/projects/${project.slug}`,
    slug: project.slug,
    blocks: parseMarkdown(project.body),
  })),
];
const byPath = new Map(docs.map((doc) => [doc.path, doc]));
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;

test('every internal link and heading anchor in content resolves', () => {
  for (const doc of docs) {
    for (const text of texts(doc.blocks)) {
      for (const match of text.matchAll(LINK)) {
        const href = match[2];
        const safe = safeHref(href);
        assert.ok(safe, `${doc.path}: unsafe link ${href}`);

        if (/^(https?:|mailto:)/i.test(safe) || safe.startsWith('//')) continue;

        const withoutHash = safe.split('#');
        const pathname = withoutHash[0].split('?')[0].replace(/\/$/, '') || '/';
        const fragment = withoutHash[1] ? decodeURIComponent(withoutHash[1]) : '';

        assert.match(pathname, /^\//, `${doc.path}: relative link ${href} does not resolve`);

        const target = byPath.get(pathname);
        if (target) {
          assert.ok(
            !fragment || headingIds(target.blocks).has(fragment),
            `${doc.path}: ${href} points at a missing heading`
          );
          continue;
        }

        const tagRoute = /^\/(notes|projects)\/tags\/([^/]+)$/.exec(pathname);
        if (tagRoute) {
          const tags = tagRoute[1] === 'notes' ? noteTags : projectTags;
          assert.ok(tags.has(tagRoute[2]), `${doc.path}: ${href} points at a missing tag`);
          continue;
        }

        assert.ok(staticRoutes.has(pathname), `${doc.path}: ${href} points at a missing page`);
      }
    }
  }
});
