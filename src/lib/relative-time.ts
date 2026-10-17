const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 1000],
  ['minute', 60_000],
  ['hour', 3_600_000],
  ['day', 86_400_000],
  ['week', 604_800_000],
  ['month', 2_592_000_000],
  ['year', 31_536_000_000],
];

// "3 minutes ago", "yesterday" — self-updates when the caller re-renders.
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  // A just-sent entry can land a couple of seconds "ahead" of the clock the
  // page mounted with — call that "now" instead of "in 2 seconds".
  if (abs < 5000) return rtf.format(0, 'second');
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let ms = 1000;
  for (const [u, m] of UNITS) {
    if (abs >= m) {
      unit = u;
      ms = m;
    }
  }
  return rtf.format(Math.round(diff / ms), unit);
}
