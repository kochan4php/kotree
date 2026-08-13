import type { Context } from '@netlify/edge-functions';

// Edge-level guard for the Gemini proxy: blocks floods at the CDN before
// they reach the serverless function / Mongo. Runs ONLY for /api/chat, so
// the homepage TTFB is untouched.
//
// context.ip is the real socket IP as seen by the CDN — client-supplied
// X-Forwarded-For cannot spoof it.
//
// ponytail: in-memory window per edge isolate (per PoP node); Cloudflare-style
// durable rate limits would need KV — add only if the site ever scales out.
const EDGE_MAX = 20; // per IP per minute
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export default async (request: Request, context: Context) => {
  const ip = context.ip ?? 'unknown';
  const now = Date.now();
  const window = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (window.length >= EDGE_MAX) {
    hits.set(ip, window);
    return new Response('Edge rate limit exceeded', { status: 429 });
  }

  window.push(now);
  hits.set(ip, window);
  return context.next();
};
