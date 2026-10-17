import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { deleteGuestbookEntry } from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  if (isRateLimited(`admin:${getClientIp(request)}`, 20)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const forbidden = guardAdmin(request);
  if (forbidden) return forbidden;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!ObjectId.isValid(id)) return new NextResponse('Bad Request', { status: 400 });

  try {
    const deleted = await deleteGuestbookEntry(id);
    return deleted ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
