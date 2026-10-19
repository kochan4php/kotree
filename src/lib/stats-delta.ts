// G4 + G6: the readings of the daily click series that the stats and Wrapped
// pages show. Kept out of the pages so the arithmetic — and its edges — can be
// pinned by a unit test.

export interface WeekChange {
  last7: number;
  previous7: number;
  /** Percentage change, rounded. Null when there is nothing to compare. */
  percent: number | null;
}

export function weekChange(days: { count: number }[]): WeekChange {
  const sum = (rows: { count: number }[]) => rows.reduce((total, day) => total + day.count, 0);
  const last7 = sum(days.slice(-7));
  const previous7 = sum(days.slice(-14, -7));
  return {
    last7,
    previous7,
    percent: previous7 === 0 ? null : Math.round(((last7 - previous7) / previous7) * 100),
  };
}

// G6: the longest run of consecutive calendar days in the series. Days are
// YYYY-MM-DD, so a sorted list is also a chronological one; unparseable
// entries are ignored rather than ending a run.
export function longestStreak(days: string[]): number {
  let best = 0;
  let run = 0;
  let previous = Number.NaN;
  for (const day of [...new Set(days)].sort()) {
    const time = Date.parse(`${day}T00:00:00Z`);
    if (!Number.isFinite(time)) continue;
    run = time - previous === 86_400_000 ? run + 1 : 1;
    previous = time;
    if (run > best) best = run;
  }
  return best;
}
