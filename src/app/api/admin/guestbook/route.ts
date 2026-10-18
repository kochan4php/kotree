import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  addAudit,
  banGuestbookIpHash,
  deleteGuestbookEntry,
  setGuestbookHidden,
  setGuestbookPinned,
  setGuestbookReply,
  unbanGuestbookIpHash,
} from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { adminRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// M47: how long a temporary moderation ban lasts
const BAN_HOURS = 24;

// K30/M43/M47: pin, hide (one entry or a bulk selection) and reply — all from
// the moderation list. Each branch audits what it changed.
export async function PATCH(request: Request) {
  const limited = await adminRateLimited('write', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const ip = getClientIp(request);

    // M43: attach an admin reply, or clear it with an empty string
    if (typeof body.reply === 'string' && ObjectId.isValid(body.id)) {
      const reply = body.reply.trim().substring(0, 200);
      const updated = await setGuestbookReply(body.id, reply || null);
      if (updated) await addAudit('guestbook_reply', body.id, ip).catch(() => {});
      return updated ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
    }

    // M47: hide / unhide — accepts a single id or an array for bulk actions
    if (typeof body.hidden === 'boolean') {
      const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [String(body.id ?? '')];
      const changed = await setGuestbookHidden(ids, body.hidden);
      if (changed > 0) {
        await addAudit(body.hidden ? 'guestbook_hide' : 'guestbook_unhide', `${changed} entr${changed === 1 ? 'y' : 'ies'}`, ip).catch(() => {});
      }
      return changed > 0
        ? NextResponse.json({ success: true, changed })
        : new NextResponse('Not Found', { status: 404 });
    }

    // K30: pin / unpin
    if (typeof body.pinned === 'boolean' && ObjectId.isValid(body.id)) {
      const updated = await setGuestbookPinned(body.id, body.pinned);
      if (updated) {
        await addAudit(body.pinned ? 'guestbook_pin' : 'guestbook_unpin', body.id, ip).catch(() => {});
      }
      return updated ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
    }

    return new NextResponse('Bad Request', { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

// M47: temporary ban / unban keyed on the hashed IP shown in the panel
export async function POST(request: Request) {
  const limited = await adminRateLimited('write', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const ipHash = String(body.ipHash ?? '');
    if (!/^[a-f0-9]{32}$/i.test(ipHash) || (body.action !== 'ban' && body.action !== 'unban')) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const ip = getClientIp(request);
    if (body.action === 'ban') {
      await banGuestbookIpHash(ipHash, new Date(Date.now() + BAN_HOURS * 60 * 60 * 1000));
      await addAudit('guestbook_ban', ipHash, ip).catch(() => {});
    } else {
      await unbanGuestbookIpHash(ipHash);
      await addAudit('guestbook_unban', ipHash, ip).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update ban' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const limited = await adminRateLimited('write', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request, { csrf: true });
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
