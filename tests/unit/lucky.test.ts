import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LUCKY_POOL, weightedPick } from '../../src/lib/lucky.ts';

test('weightedPick maps rand across the cumulative weights', () => {
  const items = ['a', 'b', 'c'];
  assert.equal(weightedPick(items, () => 1, 0), 'a');
  assert.equal(weightedPick(items, () => 1, 0.34), 'b');
  assert.equal(weightedPick(items, () => 1, 0.67), 'c');
  assert.equal(weightedPick(items, () => 1, 0.999), 'c');
});

test('zero-weight items are skipped', () => {
  const items = ['a', 'b'];
  assert.equal(weightedPick(items, (item) => (item === 'a' ? 0 : 1), 0), 'b');
  assert.equal(weightedPick(items, (item) => (item === 'a' ? 0 : 1), 0.999), 'b');
});

test('rarely visited pages carry more weight than well-worn ones', () => {
  const visits: Record<string, number> = { '/': 20, '/notes': 0 };
  const weight = (href: string) => 1 / (1 + (visits[href] ?? 0));
  const pool = ['/', '/notes'];
  // Low roll lands in the first slice — which is tiny for the visited page
  assert.equal(weightedPick(pool, weight, 0.01), '/');
  assert.equal(weightedPick(pool, weight, 0.5), '/notes');
  assert.equal(weightedPick(pool, weight, 0.99), '/notes');
});

test('the lucky pool holds no duplicate hrefs', () => {
  const hrefs = new Set(LUCKY_POOL.map((page) => page.href));
  assert.equal(hrefs.size, LUCKY_POOL.length);
});
