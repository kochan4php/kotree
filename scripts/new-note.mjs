// I7: scaffold a note with the frontmatter the site expects. Files are dated
// and the slug is the filename, matching every note already in content/notes.
// The template is deliberately dull: an empty summary and tags are valid, and
// the build stays honest about a half-written note instead of inventing one.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function noteFile(slug, date, root = process.cwd()) {
  return path.join(root, 'content', 'notes', `${date}-${slug}.md`);
}

export function renderNote(slug, date) {
  const title = slug.replace(/-/g, ' ').replace(/^./, (character) => character.toUpperCase());
  return `---
title: ${title}
date: ${date}
tags:
summary:
---

Write the first paragraph here — one or two sentences that say why the note exists.

## A heading

The rest.
`;
}

export function main(argv) {
  const slug = argv[2];
  if (!slug || !SLUG.test(slug)) {
    console.error('usage: pnpm new:note <slug>   (kebab-case, e.g. offline-first)');
    process.exitCode = 2;
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const file = noteFile(slug, date);
  if (fs.existsSync(file)) {
    console.error(`${path.relative(process.cwd(), file)} already exists`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderNote(slug, date));
  console.log(`created ${path.relative(process.cwd(), file)}`);
  console.log('next: fill in the summary and tags, then run `pnpm changelog:draft` before shipping.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv);
