// In-memory rate limiter. ponytail: single-process cache, resets on restart and
// doesn't share across serverless instances. Use Redis if the app ever scales out.
const hits = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const MAX_HITS = 30;

// Client IP from the LAST XFF hop: earlier hops are client-supplied and spoofable
// (a rotating fake X-Forwarded-For would otherwise bypass the rate limiter).
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',').pop()!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const window = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (window.length >= MAX_HITS) {
    hits.set(key, window);
    return true;
  }

  window.push(now);
  hits.set(key, window);
  return false;
}
