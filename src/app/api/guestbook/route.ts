import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  getGuestbookEntries,
  addGuestbookEntry,
  reactToGuestbookEntry,
  deleteGuestbookOwnEntry,
  editGuestbookOwnEntry,
  hashIp,
  isGuestbookIpHashBanned,
} from '@/connections/mongodb';
import { guardOrigin, validateToken } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { jsonWithEtag } from '@/lib/http-cache';

// M40/M41: the device token never reaches the database raw — only this hash
// does, and edit/delete requests must present the token again.
const ownerHashOf = (owner: unknown): string | undefined =>
  typeof owner === 'string' && owner.length >= 8 ? hashIp(owner) : undefined;

// K58: control and zero-width characters survive trim() and can wreck the
// wall's layout — strip them here, not in the renderer. Newlines are kept.
const cleanMessage = (raw: string) =>
  raw
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .substring(0, 100); // Max 100 chars

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get('limit') ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 10;
    const beforeRaw = searchParams.get('before');
    const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? beforeRaw : undefined;
    const sort = searchParams.get('sort') === 'top' ? ('top' as const) : ('newest' as const);
    const entries = await getGuestbookEntries(limit, before, sort);
    // M26: conditional GET — unchanged walls cost a 304, not a payload
    return jsonWithEtag(request, entries);
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
    // M47: a temporary moderation ban silences posts, reactions and votes
    if (await isGuestbookIpHashBanned(hashIp(ip))) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    if (await isRateLimited(`guestbook:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }

    const clean = cleanMessage(body.message);
    if (clean.length === 0) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Get IP and User-Agent
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // M40: the id goes back so the sender can edit or delete the entry later
    const id = await addGuestbookEntry(clean, ip, userAgent, ownerHashOf(body.owner));
    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 });
  }
}

// M41: edit inside the five-minute window, proven with the same device token
// the entry was posted with. The previous text is kept in `history`.
export async function PUT(request: Request) {
  try {
    const forbidden = guardOrigin(request);
    if (forbidden) return forbidden;

    const body = await request.json();
    if (!validateToken(body._token)) {
      return new NextResponse('Invalid CSRF Token', { status: 403 });
    }

    const ownerHash = ownerHashOf(body.owner);
    const id = typeof body.id === 'string' ? body.id : '';
    if (!ownerHash || !ObjectId.isValid(id) || typeof body.message !== 'string') {
      return new NextResponse('Bad Request', { status: 400 });
    }
    const clean = cleanMessage(body.message);
    if (clean.length === 0) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const ip = getClientIp(request);
    if (await isRateLimited(`guestbook-own:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }

    const result = await editGuestbookOwnEntry(id, ownerHash, clean);
    if (result === 'expired') {
      return NextResponse.json({ error: 'Edit window closed' }, { status: 409 });
    }
    return result === 'ok' ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to edit entry' }, { status: 500 });
  }
}

// M40: the author removes their own message — soft delete, audit fields kept.
export async function DELETE(request: Request) {
  try {
    const forbidden = guardOrigin(request);
    if (forbidden) return forbidden;

    const { searchParams } = new URL(request.url);
    const ownerHash = ownerHashOf(searchParams.get('owner'));
    const id = searchParams.get('id') ?? '';
    if (!ownerHash || !ObjectId.isValid(id)) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const ip = getClientIp(request);
    if (await isRateLimited(`guestbook-own:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }

    const deleted = await deleteGuestbookOwnEntry(id, ownerHash);
    return deleted ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}

// M46: five reactions; the server enforces one per entry per visitor-day.
const ALLOWED_REACTIONS = ['👍', '❤️', '🔥', '😂', '🤯'];

export async function PATCH(request: Request) {
  try {
    const forbidden = guardOrigin(request);
    if (forbidden) return forbidden;

    const body = await request.json();
    if (!validateToken(body._token)) {
      return new NextResponse('Invalid CSRF Token', { status: 403 });
    }
    if (typeof body.id !== 'string' || !ALLOWED_REACTIONS.includes(body.reaction)) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const ip = getClientIp(request);
    if (await isRateLimited(`guestbook-react:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }

    const result = await reactToGuestbookEntry(body.id, body.reaction, hashIp(ip));
    if (result === 'missing') return new NextResponse('Not Found', { status: 404 });
    // Duplicate is idempotent success: the count already includes today's vote
    return NextResponse.json({ success: true, counted: result === 'ok' });
  } catch {
    return NextResponse.json({ error: 'Failed to react' }, { status: 500 });
  }
}
