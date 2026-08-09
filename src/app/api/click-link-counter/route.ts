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

    if (isRateLimited(`click-counter:${name}`)) {
      return new Response('Too Many Requests', { status: 429 });
    }

    const count =
      typeof body.count === 'number' && Number.isFinite(body.count) ? Math.min(MAX_COUNT, Math.max(0, Math.floor(body.count))) : 1;

    await incrementLinkCount(name, count);
    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }
}
