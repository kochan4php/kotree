import { NextResponse } from 'next/server';
import {
  addAudit,
  deleteWebmention,
  getAdminWebmentions,
  setWebmentionStatus,
} from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { adminRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await adminRateLimited('read', request);
  if (limited) return limited;
  const forbidden = await guardAdmin(request);
  if (forbidden) return forbidden;
  try {
    return NextResponse.json({ webmentions: await getAdminWebmentions() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to load webmentions' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const limited = await adminRateLimited('write', request);
  if (limited) return limited;
  const forbidden = await guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    const status = body.status;
    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      return new NextResponse('Bad Request', { status: 400 });
    }
    const updated = await setWebmentionStatus(id, status);
    if (updated) await addAudit(`webmention_${status}`, id, getClientIp(request)).catch(() => {});
    return updated ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to update webmention' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const limited = await adminRateLimited('write', request);
  if (limited) return limited;
  const forbidden = await guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  try {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    const removed = await deleteWebmention(id);
    if (removed) await addAudit('webmention_delete', id, getClientIp(request)).catch(() => {});
    return removed ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete webmention' }, { status: 500 });
  }
}
