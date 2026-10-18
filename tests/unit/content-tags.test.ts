// M73: tag slugs are URLs (/notes/tags/<slug>), so the conversion has to be
// stable and boring; collectTags merges the many spellings under one slug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectTags, slugifyTag } from '../../src/lib/content.ts';

test('slugifyTag turns free text into URL-safe slugs', () => {
  assert.equal(slugifyTag('Web Dev'), 'web-dev');
  assert.equal(slugifyTag('Next.js'), 'next-js');
  assert.equal(slugifyTag('  PWA  '), 'pwa');
  assert.equal(slugifyTag('C++'), 'c'); // punctuation collapses, never survives
  assert.equal(slugifyTag('a---b'), 'a-b');
  assert.equal(slugifyTag('👍'), '');
  assert.equal(slugifyTag(''), '');
  assert.equal(slugifyTag('Sudah-É' /* accent stripped: only a-z0-9 survive */), 'sudah');
});

test('collectTags merges spellings under one slug and counts them', () => {
  const tags = collectTags([{ tags: ['Web Dev'] }, { tags: ['web-dev', 'Notes'] }, { tags: ['Web  Dev'] }]);
  const webDev = tags.find((tag) => tag.slug === 'web-dev');
  assert.ok(webDev);
  assert.equal(webDev.count, 3);
  assert.equal(tags.filter((tag) => tag.slug === 'web-dev').length, 1); // never duplicated
  assert.equal(tags.find((tag) => tag.slug === 'notes')?.count, 1);
});
