import { NextResponse } from 'next/server';
import {
  getActivePoll,
  getArchivedPolls,
  hashIp,
  isGuestbookIpHashBanned,
  votePoll,
} from '@/connections/mongodb';
import { guardOrigin, validateToken } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { jsonWithEtag } from '@/lib/http-cache';

export const dynamic = 'force-dynamic';

// M44: the active question plus the archive of past ones, in one payload.
export async function GET(request: Request) {
  try {
    const [active, archive] = await Promise.all([getActivePoll(), getArchivedPolls(3)]);
    return jsonWithEtag(request, { active, archive });
  } catch {
    return NextResponse.json({ error: 'Failed to load poll' }, { status: 500 });
  }
}

// M44: one vote per hashed IP per day, enforced by a unique index.
export async function POST(request: Request) {
  try {
    const forbidden = guardOrigin(request);
    if (forbidden) return forbidden;

    const body = await request.json();
    if (body._honeypot) return new NextResponse('OK', { status: 200 });

    if (!validateToken(body._token)) {
      return new NextResponse('Invalid CSRF Token', { status: 403 });
    }

    const ip = getClientIp(request);
    if (await isGuestbookIpHashBanned(hashIp(ip))) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    if (await isRateLimited(`poll-vote:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }

    const result = await votePoll(String(body.pollId ?? ''), Number(body.optionIndex), hashIp(ip));
    if (result === 'missing') return new NextResponse('Not Found', { status: 404 });
    if (result === 'closed') return NextResponse.json({ error: 'Poll closed' }, { status: 409 });
    if (result === 'duplicate') return NextResponse.json({ error: 'Already voted today' }, { status: 409 });

    // Live results ride back with the vote so the bars fill immediately
    const active = await getActivePoll();
    return NextResponse.json({ success: true, active });
  } catch {
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
