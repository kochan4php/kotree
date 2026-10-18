import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, streakFrom, sanitizeProgress, type AchievementState } from '../../src/lib/achievements.ts';

test('streakFrom counts consecutive days ending today', () => {
  assert.equal(streakFrom(['2026-10-16', '2026-10-17', '2026-10-18'], '2026-10-18'), 3);
});

test('a streak survives until a full day is missed', () => {
  // Today not visited yet, but yesterday was — the run still counts
  assert.equal(streakFrom(['2026-10-16', '2026-10-17'], '2026-10-18'), 2);
  // Two days missed — the run is over
  assert.equal(streakFrom(['2026-10-16'], '2026-10-18'), 0);
  assert.equal(streakFrom([], '2026-10-18'), 0);
});

test('streakFrom steps across month and year boundaries', () => {
  assert.equal(streakFrom(['2026-09-30', '2026-10-01'], '2026-10-01'), 2);
  assert.equal(streakFrom(['2025-12-31', '2026-01-01'], '2026-01-01'), 2);
});

test('achievements are earned from the state they advertise', () => {
  const base: AchievementState = {
    secretsFound: 0,
    totalSecrets: 14,
    streak: 0,
    veteran: false,
    quizBest: 0,
    pollVoted: false,
    explored: false,
  };
  const earned = (patch: Partial<AchievementState>) =>
    ACHIEVEMENTS.filter((badge) => badge.earned({ ...base, ...patch })).map((badge) => badge.id);
  assert.deepEqual(earned({}), []);
  assert.ok(earned({ streak: 3 }).includes('streak3'));
  assert.ok(!earned({ streak: 2 }).includes('streak3'));
  assert.ok(earned({ secretsFound: 14 }).includes('secretsAll'));
  assert.ok(earned({ quizBest: 5 }).includes('quiz'));
  assert.ok(earned({ veteran: true, explored: true }).includes('veteran'));
});

test('sanitizeProgress rejects everything that is not a progress object', () => {
  assert.equal(sanitizeProgress(null), null);
  assert.equal(sanitizeProgress('nope'), null);
  assert.equal(sanitizeProgress([1, 2, 3]), null);
  assert.equal(sanitizeProgress(42), null);
});

test('sanitizeProgress clamps and filters hostile input', () => {
  const clean = sanitizeProgress({
    secrets: ['terminal', 7, { evil: true }, 'win95'],
    visitDays: ['2026-10-18', 'not-a-day', '2026-13-99', 5],
    quizBest: 99,
    veteran: 'yes',
    pollVoted: true,
  });
  assert.ok(clean);
  assert.deepEqual(clean.secrets, ['terminal', 'win95']);
  assert.deepEqual(clean.visitDays, ['2026-10-18']);
  assert.equal(clean.quizBest, 5);
  assert.equal(clean.veteran, false); // only a real boolean counts
  assert.equal(clean.pollVoted, true);
});

test('sanitizeProgress caps runaway lists', () => {
  const clean = sanitizeProgress({ secrets: Array.from({ length: 500 }, (_, i) => `s${i}`) });
  assert.ok(clean);
  assert.equal(clean.secrets.length, 64);
});
