import { NextResponse } from 'next/server';
import { getGuestbookEntries, addGuestbookEntry } from '@/connections/mongodb';
import { guardOrigin, validateToken } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get('limit') ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 10;
    const beforeRaw = searchParams.get('before');
    const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? beforeRaw : undefined;
    const entries = await getGuestbookEntries(limit, before);
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const forbidden = guardOrigin(request);
    if (forbidden) return forbidden;

    const body = await request.json();

    // Honeypot trap
    if (body._honeypot) {
      console.warn(`[SECURITY] Bot trapped in guestbook honeypot`);
      return new NextResponse('OK', { status: 200 }); // fake success
    }

    if (!body.message || typeof body.message !== 'string') {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // CSRF token validation (the client already sends it — enforce it server-side)
    if (!validateToken(body._token)) {
      return new NextResponse('Invalid CSRF Token', { status: 403 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`guestbook:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    const cleanMessage = body.message.trim().substring(0, 100); // Max 100 chars
    if (cleanMessage.length === 0) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Get IP and User-Agent
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await addGuestbookEntry(cleanMessage, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 });
  }
}
