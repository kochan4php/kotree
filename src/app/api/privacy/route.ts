import { NextResponse } from 'next/server';
import {
  deleteGuestbookOwnEntries,
  getGuestbookOwnEntries,
  hashIp,
} from '@/connections/mongodb';
import { guardOrigin } from '@/lib/security';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// H5: the visitor's own slice of what the server keeps — the guestbook rows
// posted with the device token the wall already uses for its edit and delete.
// A GET to read, a DELETE to remove. No accounts, no emails, no identifiers
// beyond the token the browser minted for itself.
//
// The token is the whole proof of ownership, so the DELETE sits behind the
// origin guard like every other mutation. The GET does not: a same-origin
// page load sends no Origin header, and a cross-site reader cannot see the
// response anyway.

const ownerHashFrom = (request: Request): string | undefined => {
  const owner = new URL(request.url).searchParams.get('owner');
  return owner && owner.length >= 8 ? hashIp(owner) : undefined;
};

export async function GET(request: Request) {
  if (await isRateLimited(`privacy:${getClientIp(request)}`)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const ownerHash = ownerHashFrom(request);
  if (!ownerHash) return NextResponse.json({ error: 'Missing owner token' }, { status: 400 });

  const entries = await getGuestbookOwnEntries(ownerHash).catch(() => null);
  if (entries === null) return NextResponse.json({ error: 'Failed to read entries' }, { status: 500 });

  // Only its owner should ever hold this, and it changes the moment they delete
  return NextResponse.json({ entries }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;
  if (await isRateLimited(`privacy:${getClientIp(request)}`)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const ownerHash = ownerHashFrom(request);
  if (!ownerHash) return NextResponse.json({ error: 'Missing owner token' }, { status: 400 });

  const deleted = await deleteGuestbookOwnEntries(ownerHash).catch(() => -1);
  if (deleted < 0) return NextResponse.json({ error: 'Failed to delete entries' }, { status: 500 });

  return NextResponse.json({ deleted });
}
