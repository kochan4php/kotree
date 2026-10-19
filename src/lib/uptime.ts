// H1: the arithmetic behind the uptime strip. The strip is always the same
// width, so days the database has no beat for are padded with zeroes — a gap
// means "nobody pinged", never "the site was down".

export interface UptimeBar {
  day: string;
  beats: number;
}

export function uptimeBars(
  days: { day: string; beats: number }[],
  end: Date,
  length = 30
): UptimeBar[] {
  const byDay = new Map(days.map((entry) => [entry.day, entry.beats]));
  const bars: UptimeBar[] = [];
  for (let offset = length - 1; offset >= 0; offset -= 1) {
    const day = new Date(end.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
    bars.push({ day, beats: byDay.get(day) ?? 0 });
  }
  return bars;
}

export function uptimeSummary(bars: UptimeBar[]): { covered: number; total: number } {
  return { covered: bars.filter((bar) => bar.beats > 0).length, total: bars.length };
}
