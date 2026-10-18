import { NextResponse } from 'next/server';
import { getCspViolationCount24h, pingDb } from '@/connections/mongodb';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import pkg from '../../../../package.json';

export const dynamic = 'force-dynamic';

// M28: uptime endpoint for monitors and the post-deploy smoke test.
// 200 = everything reachable, 503 = Mongo is down (counters and guestbook
// cannot work without it). Version + commit make a deployed build identifiable.
export async function GET(request: Request) {
  if (await isRateLimited(`health:${getClientIp(request)}`, 60)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const mongo = await pingDb();
  // M63: the alert workflow watches this number against a repo-variable
  // threshold; reporting it here keeps the check to one anonymous request.
  const cspViolations24h = mongo ? await getCspViolationCount24h() : 0;
  return NextResponse.json(
    {
      status: mongo ? 'ok' : 'degraded',
      mongo,
      version: pkg.version,
      cspViolations24h,
      // Netlify sets COMMIT_REF; GitHub Actions sets GITHUB_SHA
      commit: (process.env.COMMIT_REF ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 12),
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
    { status: mongo ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
