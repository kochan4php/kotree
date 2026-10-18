import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { addAudit, deleteGuestbookEntry, setGuestbookPinned } from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// K30: pin / unpin an entry from the moderation list
export async function PATCH(request: Request) {
  if (await isRateLimited(`admin:${getClientIp(request)}`, 60)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const forbidden = guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!ObjectId.isValid(id) || typeof body.pinned !== 'boolean') {
      return new NextResponse('Bad Request', { status: 400 });
    }
    const updated = await setGuestbookPinned(id, body.pinned);
    if (updated) {
      await addAudit(body.pinned ? 'guestbook_pin' : 'guestbook_unpin', id, getClientIp(request)).catch(() => {});
    }
    return updated ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (await isRateLimited(`admin:${getClientIp(request)}`, 60)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const forbidden = guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!ObjectId.isValid(id)) return new NextResponse('Bad Request', { status: 400 });

  try {
    const deleted = await deleteGuestbookEntry(id);
    if (deleted) await addAudit('guestbook_delete', id, getClientIp(request)).catch(() => {});
    return deleted ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
