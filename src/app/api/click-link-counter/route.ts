import { after } from 'next/server';
import { getLinkCounts, incrementLinkCount } from '@/connections/mongodb';
import { socialLinks } from '@/data/social-links';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { guardOrigin, validateToken } from '@/lib/security';

const MAX_BODY_BYTES = 10_000;
const MAX_COUNT = 100;

export async function GET() {
  // Public read-only data (was previously server-rendered into the HTML).
  // No origin guard: same-origin GET fetches don't always carry an Origin
  // header, and blocking on it would silently zero out the counters.
  const counts = await getLinkCounts().catch(() => []);
  return Response.json(counts);
}

export async function POST(request: Request) {
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response('Payload Too Large', { status: 413 });
  }

  try {
    const body = (await request.json()) as { name?: unknown; count?: unknown; _token?: string; _honeypot?: boolean };

    const ip = getClientIp(request);

    // Honeypot trap
    if (body._honeypot) {
      isRateLimited(`banned:${ip}`); // Add to rate limit permanently (or max hits immediately)
      return new Response('Go away bot', { status: 403 });
    }

    // CSRF Token validation
    if (!validateToken(body._token)) {
      return new Response('Invalid CSRF Token', { status: 403 });
    }

    const name = typeof body.name === 'string' ? body.name.toLowerCase() : '';
    const isKnownLink = socialLinks.some((link) => link.name.toLowerCase() === name);
    if (!isKnownLink) {
      return new Response('Invalid name', { status: 400 });
    }
    
    if (isRateLimited(`click-counter:${name}:${ip}`)) {
      return new Response('Too Many Requests', { status: 429 });
    }

    const count =
      typeof body.count === 'number' && Number.isFinite(body.count) ? Math.min(MAX_COUNT, Math.max(0, Math.floor(body.count))) : 1;

    // Use Next.js after() to defer the DB write until after the response is sent
    // This makes the API incredibly fast for the user.
    after(async () => {
      try {
        await incrementLinkCount(name, count);
        
        // Dispatch Webhook Notification if env exists
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.TELEGRAM_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000), // never let a hung webhook hold the lambda
            body: JSON.stringify({
              content: `🚨 **New Click Detected!**\nSomeone just clicked the **${name.toUpperCase()}** link!\nIP: \`${ip.replace(/.[0-9]+$/, '.***')}\` (Masked)`
            }),
          });
        }
      } catch (err) {
        console.error('Failed to process background tasks (db/webhook):', err);
      }
    });

    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }
}
