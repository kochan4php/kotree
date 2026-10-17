import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { recordPageView } from '@/connections/mongodb';
import { guardOrigin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// K3: one beacon per navigation; the server dedupes to one view per visitor
// per page per day, mirroring the click counter.
export async function POST(request: Request) {
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  const ip = getClientIp(request);
  if (await isRateLimited(`pageview:${ip}`, 60)) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let path = '';
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path === 'string') path = body.path;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!path.startsWith('/') || path.length > 120) {
    return new NextResponse(null, { status: 400 });
  }

  const visitorHash = createHash('sha256')
    .update(`${ip}:${request.headers.get('user-agent') ?? ''}`)
    .digest('hex');

  await recordPageView(path, visitorHash).catch(() => {}); // beacons never fail loudly
  return new NextResponse(null, { status: 204 });
}
