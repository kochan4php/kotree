import { after } from 'next/server';
import { incrementLinkCount } from '@/connections/mongodb';
import { socialLinks } from '@/data/social-links';
import { isRateLimited } from '@/lib/rate-limit';
import { guardOrigin } from '@/lib/security';

const MAX_BODY_BYTES = 10_000;
const MAX_COUNT = 100;

export async function POST(request: Request) {
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response('Payload Too Large', { status: 413 });
  }

  try {
    const body = (await request.json()) as { name?: unknown; count?: unknown };

    const name = typeof body.name === 'string' ? body.name.toLowerCase() : '';
    const isKnownLink = socialLinks.some((link) => link.name.toLowerCase() === name);
    if (!isKnownLink) {
      return new Response('Invalid name', { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1';
    
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
