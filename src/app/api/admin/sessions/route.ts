import { NextResponse } from 'next/server';
import { addAudit, listAdminSessions, revokeAdminSession } from '@/connections/mongodb';
import { currentSessionId, guardAdmin } from '@/lib/security';
import { adminRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// M61: the sessions registry — what can be revoked, and which row is *this*
// browser. Only the non-secret fields leave the server; the session ids are
// truncated to a prefix so a page script never learns a usable token.
function publicSession(session: { id: string; createdAt: Date; lastSeenAt: Date; expiresAt: Date; uaHash?: string }, currentId: string | null) {
  return {
    id: session.id.slice(0, 8),
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    bound: Boolean(session.uaHash),
    current: currentId !== null && session.id === currentId,
  };
}

export async function GET(request: Request) {
  const limited = await adminRateLimited('read', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request);
  if (forbidden) return forbidden;

  try {
    const sessions = await listAdminSessions();
    const currentId = currentSessionId(request);
    return NextResponse.json({
      sessions: sessions.map((session) => publicSession(session, currentId)),
      // Prefixes match the truncated ids above; revoke accepts the prefix.
      prefixLength: 8,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

// Revoke by id prefix (the list only exposes prefixes). Revoking the current
// session is allowed — that is just a logout with extra steps.
export async function POST(request: Request) {
  const limited = await adminRateLimited('write', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  let prefix = '';
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body.id === 'string') prefix = body.id.trim().toLowerCase();
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }
  if (!/^[a-f0-9]{4,32}$/.test(prefix)) return new NextResponse('Bad Request', { status: 400 });

  try {
    const sessions = await listAdminSessions();
    const match = sessions.find((session) => session.id.startsWith(prefix));
    if (!match) return new NextResponse('Not Found', { status: 404 });
    const revoked = await revokeAdminSession(match.id);
    if (revoked) await addAudit('session_revoked', prefix, getClientIp(request)).catch(() => {});
    return NextResponse.json({ success: revoked });
  } catch {
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
