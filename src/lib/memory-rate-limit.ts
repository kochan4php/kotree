// Fixed-window counters kept in this process, used only while Mongo is
// unreachable. Per instance rather than global, but a flood during a database
// outage is still capped instead of failing open everywhere.
const MAX_ENTRIES = 10_000;
const hits = new Map<string, { count: number; expiresAt: number }>();

export function memoryRateLimited(key: string, maxHits: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const id = `${bucket}:${key}`;
  const count = (hits.get(id)?.count ?? 0) + 1;
  hits.set(id, { count, expiresAt: (bucket + 2) * windowMs });

  if (hits.size > MAX_ENTRIES) {
    for (const [entry, value] of hits) {
      if (value.expiresAt <= now || hits.size > MAX_ENTRIES) hits.delete(entry);
    }
  }

  return count > maxHits;
}
