import { NextResponse } from 'next/server';
import { reportGuestbookEntry } from '@/connections/mongodb';
import { guardOrigin, validateToken } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

// K30: "report this secret". Reports are counted, never shown publicly; the
// entry hides itself once enough pile up (see mongodb.reportGuestbookEntry).
export async function POST(request: Request) {
  try {
    const forbidden = guardOrigin(request);
    if (forbidden) return forbidden;

    const body = await request.json();
    if (!validateToken(body._token)) {
      return new NextResponse('Invalid CSRF Token', { status: 403 });
    }
    if (typeof body.id !== 'string') {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const ip = getClientIp(request);
    if (await isRateLimited(`guestbook-report:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }

    const result = await reportGuestbookEntry(body.id);
    if (result === 'missing') return new NextResponse('Not Found', { status: 404 });

    return NextResponse.json({ reported: true, hidden: result === 'hidden' });
  } catch {
    return NextResponse.json({ error: 'Failed to report entry' }, { status: 500 });
  }
}
