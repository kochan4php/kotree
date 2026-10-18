import { NextResponse } from 'next/server';
import { getBossLeaderboard, submitBossScore } from '@/connections/mongodb';
import { guardOrigin, validateToken } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { jsonWithEtag } from '@/lib/http-cache';

export async function GET(request: Request) {
  try {
    // M26: conditional GET — the board only changes when a score lands
    return jsonWithEtag(request, await getBossLeaderboard());
  } catch {
    // Leaderboard is decoration — an empty board beats a broken score screen
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const forbidden = guardOrigin(request);
    if (forbidden) return forbidden;

    const body = await request.json();
    if (!validateToken(body._token)) {
      return new NextResponse('Invalid CSRF Token', { status: 403 });
    }

    const score = Number(body.score);
    const name = String(body.name ?? '').trim().toUpperCase();
    if (!Number.isInteger(score) || score < 0 || score > 1_000_000) {
      return new NextResponse('Bad Request', { status: 400 });
    }
    if (!/^[A-Z0-9]{1,3}$/.test(name)) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const ip = getClientIp(request);
    if (await isRateLimited(`boss-score:${ip}`)) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
    }

    return NextResponse.json(await submitBossScore(name, score));
  } catch {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
