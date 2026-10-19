import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureAnchor, findAnchor } from '../../src/lib/highlight-anchor.ts';

const PAGE =
  'Kotree caches pages and delivers your secrets later. The queue survives a reload. ' +
  'The queue is capped at twenty entries.';

test('a unique quote is found without context', () => {
  const anchor = captureAnchor(PAGE, PAGE.indexOf('delivers'), PAGE.indexOf('delivers') + 29);
  assert.deepEqual(findAnchor(PAGE, anchor), { start: PAGE.indexOf('delivers'), end: PAGE.indexOf('delivers') + 29 });
});

test('a repeated quote is placed by the words around it', () => {
  const second = PAGE.lastIndexOf('The queue');
  const anchor = captureAnchor(PAGE, second, second + 9);
  assert.deepEqual(findAnchor(PAGE, anchor), { start: second, end: second + 9 });
});

test('an ambiguous quote with no usable context is dropped, not guessed', () => {
  assert.equal(findAnchor(PAGE, { text: 'The queue', before: 'zzz', after: 'zzz' }), null);
});

test('one side of the context still places the quote', () => {
  const second = PAGE.lastIndexOf('The queue');
  const anchor = captureAnchor(PAGE, second, second + 9);
  assert.deepEqual(findAnchor(PAGE, { ...anchor, after: 'changed since' }), {
    start: second,
    end: second + 9,
  });
});

test('a quote that has moved into a changed sentence is found, an absent one is not', () => {
  const anchor = captureAnchor(PAGE, PAGE.indexOf('capped'), PAGE.indexOf('capped') + 6);
  assert.deepEqual(findAnchor(`Rewritten intro. ${PAGE}`, anchor), {
    start: PAGE.indexOf('capped') + 17,
    end: PAGE.indexOf('capped') + 23,
  });
  assert.equal(findAnchor('Nothing of the sort.', anchor), null);
  assert.equal(findAnchor(PAGE, { text: '   ', before: '', after: '' }), null);
});

test('captureAnchor clamps at the edges of the page', () => {
  assert.deepEqual(captureAnchor('abcdef', 0, 3, 10), { text: 'abc', before: '', after: 'def' });
  assert.deepEqual(captureAnchor('abcdef', 3, 6, 10), { text: 'def', before: 'abc', after: '' });
});
