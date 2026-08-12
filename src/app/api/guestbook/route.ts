import { NextResponse } from 'next/server';
import { getGuestbookEntries, addGuestbookEntry } from '@/connections/mongodb';
import { guardOrigin } from '@/lib/security';

export async function GET() {
  try {
    const entries = await getGuestbookEntries();
    return NextResponse.json(entries);
  } catch (error) {
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

    const cleanMessage = body.message.trim().substring(0, 100); // Max 100 chars
    if (cleanMessage.length === 0) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Get IP and User-Agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await addGuestbookEntry(cleanMessage, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 });
  }
}
