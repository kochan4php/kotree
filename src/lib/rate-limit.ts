import { consumeRateHit } from '@/connections/mongodb';
import { memoryRateLimited } from '@/lib/memory-rate-limit';

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
// resetting with every cold process. When Mongo is unreachable the same
// counter runs in this process: an outage must not remove the ceiling.
export async function isRateLimited(key: string, maxHits = 30, windowMs = WINDOW_MS): Promise<boolean> {
  try {
    return (await consumeRateHit(key, windowMs)) > maxHits;
  } catch {
    return memoryRateLimited(key, maxHits, windowMs);
  }
}

// M62: admin traffic gets two separate budgets per IP — reads are cheap and
// plentiful (the dashboard polls), writes are the ones that touch data, so the
// ceiling is three times lower. A 429 always carries `Retry-After: 60`, the
// same second-granularity window the Mongo counters use.
export const ADMIN_READ_MAX = 90;
export const ADMIN_WRITE_MAX = 30;

export async function adminRateLimited(kind: 'read' | 'write', request: Request): Promise<Response | null> {
  const key = `admin-${kind}:${getClientIp(request)}`;
  const max = kind === 'read' ? ADMIN_READ_MAX : ADMIN_WRITE_MAX;
  if (await isRateLimited(key, max)) {
    return new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }
  return null;
}

// Global budget shared by ALL visitors: protects money-burning resources
// (Gemini quota) from floods spread across many IPs, where per-IP limits
// don't help. Same Mongo-backed counters, so the budget is truly global.
export async function isGloballyRateLimited(key: string, maxHits: number, windowMs = WINDOW_MS): Promise<boolean> {
  try {
    return (await consumeRateHit(`global:${key}`, windowMs)) > maxHits;
  } catch {
    return memoryRateLimited(`global:${key}`, maxHits, windowMs);
  }
}
