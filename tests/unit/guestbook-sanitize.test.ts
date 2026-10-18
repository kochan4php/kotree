// M73: the guestbook message cleaner gets a deterministic fuzz — 500 seeded
// strings built from exactly the characters that used to wreck the wall
// (control codes, zero-width joiners, bidi overrides, lone surrogates' ilk,
// emoji, combining marks, newlines).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanMessage } from '../../src/app/api/guestbook/route.ts';

const NASTY = [
  '\u0000', '\u0007', '\u000b', '\u001b', '\u200b', '\u200c', '\u200d', '\ufeff',
  '\u007f', '\u009f', '\u202e', '\n', '\r', '\t', ' ', 'a', 'Z', '9', '👍', 'é',
  '\u0301', '<', '>', '&', '"', "'", '/', '\\', '`', '\u180e', '中',
];

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test('cleanMessage never throws and never lets junk through (deterministic fuzz)', () => {
  const rand = seeded(20261018);
  for (let round = 0; round < 500; round++) {
    let input = '';
    const length = Math.floor(rand() * 60);
    for (let i = 0; i < length; i++) input += NASTY[Math.floor(rand() * NASTY.length)];

    const clean = cleanMessage(input);
    assert.ok(clean.length <= 100, `over the cap: ${clean.length}`);
    assert.equal(clean, clean.normalize('NFC'));
    // The same character classes the route strips, none may survive
    assert.doesNotMatch(clean, /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/);
    // Cleaning twice changes nothing — the second pass has no work left
    assert.equal(cleanMessage(clean), clean);
  }
});

test('cleanMessage keeps what matters and trims the rest', () => {
  assert.equal(cleanMessage('  hi \u200b there  '), 'hi  there'); // the joiner left its gap behind
  assert.equal(cleanMessage('line one\nline two'), 'line one\nline two'); // newlines are content
  assert.equal(cleanMessage('👍 é'), '👍 é'); // composed unicode survives NFC
  assert.equal(cleanMessage('a'.repeat(150)).length, 100); // hard cap
  assert.equal(cleanMessage('\u0000\u0007\u001b'), '');
});
