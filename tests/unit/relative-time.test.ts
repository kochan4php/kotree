import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime } from '../../src/lib/relative-time.ts';

const NOW = Date.parse('2026-06-15T10:00:00.000Z');
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

test('relativeTime calls the last few seconds "now" either way', () => {
  assert.equal(relativeTime(at(0), NOW), 'now');
  assert.equal(relativeTime(at(-4_000), NOW), 'now');
  // A just-sent entry can look a couple of seconds "ahead" of the mounted clock
  assert.equal(relativeTime(at(2_000), NOW), 'now');
});

test('relativeTime renders the usual buckets', () => {
  assert.equal(relativeTime(at(-30_000), NOW), '30 seconds ago');
  assert.equal(relativeTime(at(-MIN), NOW), '1 minute ago');
  assert.equal(relativeTime(at(-3 * MIN), NOW), '3 minutes ago');
  assert.equal(relativeTime(at(-2 * HOUR), NOW), '2 hours ago');
  assert.equal(relativeTime(at(-3 * DAY), NOW), '3 days ago');
  assert.equal(relativeTime(at(-DAY), NOW), 'yesterday');
  assert.equal(relativeTime(at(-2 * 7 * DAY), NOW), '2 weeks ago');
  assert.equal(relativeTime(at(-2 * 30 * DAY), NOW), '2 months ago');
  assert.equal(relativeTime(at(-2 * 365 * DAY), NOW), '2 years ago');
});

test('relativeTime handles the future too', () => {
  assert.equal(relativeTime(at(MIN), NOW), 'in 1 minute');
  assert.equal(relativeTime(at(90 * MIN), NOW), 'in 2 hours');
});
