import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';
import { repoSlug, shapeRepo } from '@/lib/repo-stats';

// G3: the repository card's data. GitHub allows 60 unauthenticated calls an
// hour per address, so the answer is cached for an hour and shaped down to the
// numbers the card shows. Every failure is a shrug the card hides.
export const dynamic = 'force-dynamic';

const CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };

export async function GET(request: Request) {
  const repo = repoSlug(new URL(request.url).searchParams.get('repo'));
  if (!repo) return NextResponse.json({ error: 'Give repo as owner/name' }, { status: 400 });
  if (await isRateLimited(`repo-stats:${getClientIp(request)}`, 20)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'kotree' },
    next: { revalidate: 3600 },
    // A slow GitHub must never hold a visitor's request open
    signal: AbortSignal.timeout(3000),
  }).catch(() => null);

  if (!response) return NextResponse.json({ error: 'GitHub did not answer' }, { status: 502 });
  if (!response.ok) {
    return NextResponse.json(
      { error: response.status === 404 ? 'No such repository' : 'GitHub refused' },
      { status: response.status === 404 ? 404 : 502, headers: CACHE },
    );
  }

  const stats = shapeRepo(await response.json().catch(() => null));
  if (!stats) return NextResponse.json({ error: 'Unexpected answer' }, { status: 502, headers: CACHE });

  return NextResponse.json(stats, { headers: CACHE });
}
