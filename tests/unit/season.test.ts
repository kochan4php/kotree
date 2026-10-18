import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonFor } from '../../src/lib/season.ts';

const d = (year: number, month: number, day: number) => new Date(year, month - 1, day);

test('seasonFor covers the year without surprises', () => {
  assert.equal(seasonFor(d(2026, 2, 25)), '🌙 Ramadan');
  assert.equal(seasonFor(d(2026, 3, 20)), '🌙 Eid Mubarak');
  assert.equal(seasonFor(d(2026, 1, 1)), '🎆 New year, new clicks');
  assert.equal(seasonFor(d(2026, 12, 31)), '🎆 New year, new clicks');
  assert.equal(seasonFor(d(2026, 10, 28)), '🎃 Spooky season');
  assert.equal(seasonFor(d(2026, 12, 10)), '🎄 Festive season');
  assert.equal(seasonFor(d(2026, 6, 15)), '');
});

test('seasonFor boundaries pick the right side', () => {
  assert.equal(seasonFor(d(2026, 1, 2)), '🎆 New year, new clicks');
  assert.equal(seasonFor(d(2026, 1, 3)), '');

  assert.equal(seasonFor(d(2026, 12, 1)), '🎄 Festive season');
  assert.equal(seasonFor(d(2026, 12, 26)), '🎄 Festive season');
  assert.equal(seasonFor(d(2026, 12, 27)), '');

  assert.equal(seasonFor(d(2027, 3, 8)), '🌙 Ramadan');
  assert.equal(seasonFor(d(2027, 3, 9)), '🌙 Eid Mubarak');
  assert.equal(seasonFor(d(2028, 3, 2)), '');
});
