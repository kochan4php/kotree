import { test } from 'node:test';
import assert from 'node:assert/strict';
import { longestStreak, weekChange } from '../../src/lib/stats-delta.ts';

const days = (counts: number[]) => counts.map((count) => ({ count }));

test('the last seven days are compared with the seven before them', () => {
  const series = days([...Array(16).fill(1), ...Array(7).fill(3), ...Array(7).fill(2)]);
  assert.deepEqual(weekChange(series), { last7: 14, previous7: 21, percent: -33 });
});

test('a quiet week is reported as growth, and a shrinking one as a fall', () => {
  assert.deepEqual(weekChange(days([...Array(23).fill(0), ...Array(7).fill(5)])), {
    last7: 35,
    previous7: 0,
    percent: null,
  });
  assert.deepEqual(weekChange(days([...Array(23).fill(4), ...Array(7).fill(2)])), {
    last7: 14,
    previous7: 28,
    percent: -50,
  });
});

test('a level week is zero, not null, and short series still work', () => {
  assert.deepEqual(weekChange(days([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])), {
    last7: 7,
    previous7: 7,
    percent: 0,
  });
  assert.deepEqual(weekChange(days([2, 2, 2])), { last7: 6, previous7: 0, percent: null });
  assert.deepEqual(weekChange([]), { last7: 0, previous7: 0, percent: null });
});

test('a streak counts consecutive days, not days with a click', () => {
  assert.equal(longestStreak(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-06']), 3);
  // A run that crosses a month — and a year — boundary is still one run
  assert.equal(longestStreak(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']), 4);
});

test('unsorted, repeated and malformed days do not fool the streak', () => {
  assert.equal(longestStreak(['2026-02-02', '2026-02-01', '2026-02-01', 'nonsense', '2026-02-03']), 3);
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak(['2026-12-31', '2026-01-01']), 1);
});
