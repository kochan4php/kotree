import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uptimeBars, uptimeSummary } from '../../src/lib/uptime.ts';

test('the strip is one slot per day, oldest first, ending today', () => {
  const bars = uptimeBars([{ day: '2026-10-18', beats: 3 }], new Date('2026-10-19T12:00:00Z'), 5);
  assert.deepEqual(
    bars.map((bar) => bar.day),
    ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19']
  );
  assert.deepEqual(
    bars.map((bar) => bar.beats),
    [0, 0, 0, 3, 0]
  );
  assert.deepEqual(uptimeSummary(bars), { covered: 1, total: 5 });
});

test('days outside the window are ignored and beats beyond it are kept whole', () => {
  const days = [
    { day: '2026-10-01', beats: 99 },
    { day: '2026-10-19', beats: 7 },
  ];
  const bars = uptimeBars(days, new Date('2026-10-19T00:30:00Z'), 3);
  assert.deepEqual(
    bars.map((bar) => [bar.day, bar.beats]),
    [
      ['2026-10-17', 0],
      ['2026-10-18', 0],
      ['2026-10-19', 7],
    ]
  );
  assert.deepEqual(uptimeSummary(bars), { covered: 1, total: 3 });
  assert.deepEqual(uptimeSummary(uptimeBars([], new Date('2026-10-19T00:00:00Z'), 4)), {
    covered: 0,
    total: 4,
  });
});

test('a month boundary does not shift a slot', () => {
  const bars = uptimeBars([], new Date('2026-11-01T09:00:00Z'), 3);
  assert.deepEqual(
    bars.map((bar) => bar.day),
    ['2026-10-30', '2026-10-31', '2026-11-01']
  );
});
