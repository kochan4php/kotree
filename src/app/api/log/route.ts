import { NextResponse } from 'next/server';
import { addClientError } from '@/connections/mongodb';
import { guardOrigin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 20_000;
const MAX_LEN = { message: 500, source: 100, stack: 2000, url: 300 };

// Client error reports (R41). Called by the ErrorReporter component via
// sendBeacon; the admin dashboard reads them back through /api/admin/overview.
export async function POST(request: Request) {
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  if (isRateLimited(`log:${getClientIp(request)}`, 10)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return new NextResponse('Payload Too Large', { status: 413 });
  }

  try {
    const body = (await request.json()) as { message?: unknown; source?: unknown; stack?: unknown; url?: unknown };
    const message = typeof body.message === 'string' ? body.message.slice(0, MAX_LEN.message) : '';
    if (!message.trim()) return new NextResponse('Bad Request', { status: 400 });

    await addClientError({
      message,
      source: typeof body.source === 'string' ? body.source.slice(0, MAX_LEN.source) : 'error',
      stack: typeof body.stack === 'string' ? body.stack.slice(0, MAX_LEN.stack) : undefined,
      url: typeof body.url === 'string' ? body.url.slice(0, MAX_LEN.url) : undefined,
    });
    return new NextResponse('OK', { status: 200 });
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
}
