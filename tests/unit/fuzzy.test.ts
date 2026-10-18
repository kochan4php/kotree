import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzy } from '../../src/lib/fuzzy.ts';

test('fuzzy matches subsequences and reports the hit positions', () => {
  const match = fuzzy('chg', 'changelog');
  assert.ok(match);
  assert.deepEqual(match.indices, [0, 1, 4]); // c, h, then the next g
});

test('fuzzy rejects strings that do not contain the query in order', () => {
  assert.equal(fuzzy('zzz', 'changelog'), null);
  assert.equal(fuzzy('glc', 'changelog'), null);
});

test('a prefix hit beats a scattered mid-word hit', () => {
  const prefix = fuzzy('note', 'notes');
  const scattered = fuzzy('note', 'a-note'); // starts later in the string
  assert.ok(prefix && scattered);
  assert.ok(prefix.score > scattered.score);
});

test('word starts and adjacent runs score above gaps', () => {
  const tight = fuzzy('np', 'note-pen');
  const loose = fuzzy('np', 'napkin pot'); // n and p far apart, still in order
  assert.ok(tight && loose);
  assert.ok(tight.score > loose.score);
});

test('every index points at the matching character', () => {
  const match = fuzzy('sr', 'search');
  assert.ok(match);
  for (const index of match.indices) {
    assert.ok('search'[index]);
  }
  assert.equal('search'[match.indices[0]], 's');
  assert.equal('search'[match.indices[1]], 'r');
});
