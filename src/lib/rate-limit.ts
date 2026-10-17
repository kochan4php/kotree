import { consumeRateHit } from '@/connections/mongodb';

const WINDOW_MS = 60_000;

// Client IP from the LAST XFF hop: earlier hops are client-supplied and spoofable
// (a rotating fake X-Forwarded-For would otherwise bypass the rate limiter).
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',').pop()!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// K6: limits live in Mongo (one small fixed-window bucket per key, cleaned up
// by a TTL index), so they hold across serverless instances instead of
// resetting with every cold process. Fails OPEN when Mongo is unreachable —
// an outage must never lock everyone out of the site.
export async function isRateLimited(key: string, maxHits = 30, windowMs = WINDOW_MS): Promise<boolean> {
  try {
    return (await consumeRateHit(key, windowMs)) > maxHits;
  } catch {
    return false;
  }
}

// Global budget shared by ALL visitors: protects money-burning resources
// (Gemini quota) from floods spread across many IPs, where per-IP limits
// don't help. Same Mongo-backed counters, so the budget is truly global.
export async function isGloballyRateLimited(key: string, maxHits: number, windowMs = WINDOW_MS): Promise<boolean> {
  try {
    return (await consumeRateHit(`global:${key}`, windowMs)) > maxHits;
  } catch {
    return false;
  }
}
