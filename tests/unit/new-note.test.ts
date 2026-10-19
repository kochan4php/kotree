import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteFile, renderNote, SLUG } from '../../scripts/new-note.mjs';

// I7: the scaffolder is the first thing a new note touches, so its two
// decisions — which slugs are legal and what the frontmatter looks like — are
// pinned here rather than discovered by a broken build.

test('the scaffold refuses anything but a kebab-case slug', () => {
  for (const good of ['offline-first', 'a', 'notes-2026', 'x1-y2']) {
    assert.ok(SLUG.test(good), good);
  }
  for (const bad of ['Offline', 'offline first', '../escape', 'trailing-', '-leading', 'two--dashes', '']) {
    assert.equal(SLUG.test(bad), false, bad);
  }
});

test('the scaffold writes the frontmatter every note carries', () => {
  const note = renderNote('offline-first', '2026-10-19');
  assert.match(note, /^---\ntitle: Offline first\ndate: 2026-10-19\ntags:\nsummary:\n---\n/);
  // The body starts after the closing fence, with no half-written fields
  assert.ok(note.includes('\n---\n\nWrite the first paragraph'));
});

test('the filename is the date and the slug, under content/notes', () => {
  const file = noteFile('offline-first', '2026-10-19', 'D:\\site');
  assert.match(file, /content[\\/]notes[\\/]2026-10-19-offline-first\.md$/);
});
