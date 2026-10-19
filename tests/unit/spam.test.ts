import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSpam, spamScore, SPAM_HOLD_SCORE } from '../../src/lib/spam.ts';

test('an ordinary message scores nothing and is not held', () => {
  const reading = spamScore('Kotree looks lovely on the phone. Well done!');
  assert.deepEqual(reading, { score: 0, reasons: [] });
  assert.equal(isSpam(reading), false);
});

test('a link inside a real sentence is not a pitch', () => {
  // One link is worth two points; seven words means the bare-link rule stays out
  const reading = spamScore('Nice work — https://deosubarno.dev is mine too');
  assert.equal(reading.score, 2);
  assert.deepEqual(reading.reasons, ['one link']);
  assert.equal(isSpam(reading), false);
});

test('a bare link drop is held, and the reason names it', () => {
  const reading = spamScore('https://spam.example.com/xyz');
  assert.ok(isSpam(reading));
  assert.ok(reading.reasons.includes('a link and almost no words'));
});

test('advert phrases are worth three each and stack with a link', () => {
  const reading = spamScore('BUY FOLLOWERS NOW www.spam.xyz FREE MONEY');
  assert.ok(reading.score >= SPAM_HOLD_SCORE);
  assert.ok(reading.reasons.some((reason) => reason.startsWith('advert phrases:')));
  // A whole URL counts once, however it is spelled
  assert.ok(reading.reasons.includes('one link'));
});

test('shouting, keyboard mashing and repetition are each noticed', () => {
  assert.equal(spamScore('THIS IS A VERY SHOUTY MESSAGE INDEED').reasons.includes('mostly capitals'), true);
  assert.equal(spamScore('THX').reasons.includes('mostly capitals'), false, 'short caps is just a shout of joy');
  assert.equal(spamScore('wowwwwwww what a site').reasons.includes('repeated characters'), true);
  assert.equal(
    spamScore('good good good good good good good good').reasons.includes('the same words over and over'),
    true
  );
});

test('the threshold is the only thing standing between the wall and the queue', () => {
  assert.equal(isSpam({ score: SPAM_HOLD_SCORE - 1, reasons: [] }), false);
  assert.equal(isSpam({ score: SPAM_HOLD_SCORE, reasons: [] }), true);
});
