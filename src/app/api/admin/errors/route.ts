import { NextResponse } from 'next/server';
import { addAudit, resolveClientError } from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { adminRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// K7: mark a reported client error as resolved (or bring it back)
export async function PATCH(request: Request) {
  const limited = await adminRateLimited('write', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  let id = '';
  let resolved = true;
  try {
    const body = (await request.json()) as { id?: unknown; resolved?: unknown };
    if (typeof body.id === 'string') id = body.id;
    if (typeof body.resolved === 'boolean') resolved = body.resolved;
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  try {
    const updated = await resolveClientError(id, resolved);
    if (updated) await addAudit('error_resolve', id, getClientIp(request)).catch(() => {});
    return updated ? NextResponse.json({ success: true }) : new NextResponse('Not Found', { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to update error' }, { status: 500 });
  }
}
