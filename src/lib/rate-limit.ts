// In-memory rate limiter. ponytail: single-process cache, resets on restart and
// doesn't share across serverless instances. Use Redis if the app ever scales out.
const hits = new Map<string, number[]>();
const globalHits = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const MAX_HITS = 30;

// Client IP from the LAST XFF hop: earlier hops are client-supplied and spoofable
// (a rotating fake X-Forwarded-For would otherwise bypass the rate limiter).
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',').pop()!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// Per-IP limit: keyed on the real client IP (see getClientIp).
export function isRateLimited(key: string, maxHits = MAX_HITS): boolean {
  const now = Date.now();
  const window = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (window.length >= maxHits) {
    hits.set(key, window);
    return true;
  }

  window.push(now);
  hits.set(key, window);
  return false;
}

// Global budget shared by ALL visitors: protects money-burning resources
// (Gemini quota) from floods spread across many IPs, where per-IP limits
// don't help. ponytail: per-instance window; Redis if the site scales out.
export function isGloballyRateLimited(key: string, maxHits: number): boolean {
  const now = Date.now();
  const window = (globalHits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (window.length >= maxHits) {
    globalHits.set(key, window);
    return true;
  }

  window.push(now);
  globalHits.set(key, window);
  return false;
}
