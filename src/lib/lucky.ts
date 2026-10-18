// M53: feeling lucky v2 — pages you visit rarely are more likely to come up,
// and the same page never repeats twice in a row. The weighted pick itself is
// pure (rand is injected) so tests can pin it.

export interface LuckyPage {
  label: string;
  href: string;
  description: string;
}

export const LUCKY_POOL: LuckyPage[] = [
  { label: 'Home', href: '/', description: 'Every link in one place' },
  { label: 'About', href: '/about', description: 'Who is behind Kotree' },
  { label: 'Now', href: '/now', description: 'What I am up to right now' },
  { label: 'Projects', href: '/projects', description: 'Things I have built' },
  { label: 'Notes', href: '/notes', description: 'Short notes, newest first' },
  { label: 'Guestbook', href: '/guestbook', description: 'The full confession wall' },
  { label: 'Changelog', href: '/changelog', description: 'Every update, newest first' },
  { label: 'Secrets', href: '/secrets', description: 'Easter eggs and spoilers' },
  { label: 'Stats', href: '/stats', description: 'Clicks, links and trends' },
  { label: 'Wrapped', href: '/wrapped', description: 'The year in numbers' },
  { label: 'Uses', href: '/uses', description: 'What this site runs on' },
  { label: 'Links', href: '/links', description: 'Words this site leans on' },
  { label: 'Explore', href: '/explore', description: 'The map of the whole site' },
];

export const VISITS_KEY = 'kotree-page-visits';
const LAST_KEY = 'kotree-lucky-last';

// Pure weighted pick — `rand` returns [0, 1). Weights must be positive.
export function weightedPick<T>(items: T[], weight: (item: T) => number, rand: number): T {
  const weights = items.map(weight);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let target = rand * total;
  for (let i = 0; i < items.length; i++) {
    target -= weights[i];
    if (target < 0) return items[i];
  }
  return items[items.length - 1];
}

export function readVisits(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(VISITS_KEY) ?? '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function pickLucky(): LuckyPage {
  const visits = readVisits();
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_KEY);
  } catch {
    // private mode — no memory, still picks
  }
  const pool = last && LUCKY_POOL.length > 1 ? LUCKY_POOL.filter((page) => page.href !== last) : LUCKY_POOL;
  // Rarely visited pages carry more weight: 1 / (1 + visits)
  const pick = weightedPick(pool, (page) => 1 / (1 + (visits[page.href] ?? 0)), Math.random());
  try {
    localStorage.setItem(LAST_KEY, pick.href);
  } catch {
    // fine — the dedupe is best-effort
  }
  return pick;
}
