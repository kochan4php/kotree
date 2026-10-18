import { NextResponse } from 'next/server';
import { addAudit, closeActivePoll, createPoll } from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// M44: one question with 2–5 short options — creating a new poll closes the
// previous one, so there is never more than one active question.
export async function POST(request: Request) {
  if (await isRateLimited(`admin:${getClientIp(request)}`, 60)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const forbidden = guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const question = String(body.question ?? '').trim().substring(0, 140);
    const options = (Array.isArray(body.options) ? body.options : [])
      .map((option: unknown) => String(option).trim().substring(0, 40))
      .filter(Boolean)
      .slice(0, 5);
    if (question.length < 3 || options.length < 2) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const id = await createPoll(question, options);
    await addAudit('poll_create', question, getClientIp(request)).catch(() => {});
    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (await isRateLimited(`admin:${getClientIp(request)}`, 60)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const forbidden = guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  try {
    const closed = await closeActivePoll();
    if (closed) await addAudit('poll_close', '', getClientIp(request)).catch(() => {});
    return NextResponse.json({ success: true, closed });
  } catch {
    return NextResponse.json({ error: 'Failed to close poll' }, { status: 500 });
  }
}
