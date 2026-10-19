import { NextResponse } from 'next/server';
import { addReaction, getReactionCounts } from '@/connections/mongodb';
import { guardOrigin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isReactionKind, isReactionPath } from '@/lib/reactions';

export const dynamic = 'force-dynamic';

// G1: a small public counter per note or project. No account and no token —
// the same Origin guard and per-IP rate limit the other beacons use are
// proportionate for a number nobody can spend. Devices remember their own
// press, so the buttons never double-count by accident.

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path');
  if (!isReactionPath(path)) {
    return NextResponse.json({ error: 'Unknown page' }, { status: 400 });
  }
  const counts = await getReactionCounts(path).catch(() => ({}));
  return NextResponse.json(counts, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' },
  });
}

export async function POST(request: Request) {
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  const ip = getClientIp(request);
  if (await isRateLimited(`reaction:${ip}`, 30)) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let body: { path?: unknown; kind?: unknown };
  try {
    body = (await request.json()) as { path?: unknown; kind?: unknown };
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!isReactionPath(body.path) || !isReactionKind(body.kind)) {
    return new NextResponse(null, { status: 400 });
  }

  const counts = await addReaction(body.path, body.kind).catch(() => null);
  if (!counts) return new NextResponse(null, { status: 503 });
  return NextResponse.json(counts);
}
