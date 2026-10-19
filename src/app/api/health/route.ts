import { NextResponse } from 'next/server';
import {
  getAppErrorCount24h,
  getCspViolationCount24h,
  getWorstLcpP75,
  pingDb,
  recordHealthBeat,
} from '@/connections/mongodb';
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

  const started = Date.now();
  const mongo = await pingDb();
  // H1: only a healthy answer is a heartbeat, and the write itself needs Mongo,
  // so /status can draw a strip of days rather than guessing at downtime.
  if (mongo) await recordHealthBeat(Date.now() - started).catch(() => {});
  // M63: the alert workflow watches this number against a repo-variable
  // threshold; reporting it here keeps the check to one anonymous request.
  const cspViolations24h = mongo ? await getCspViolationCount24h() : 0;
  // H2: the same workflow reads these two — live app errors and the slowest
  // LCP p75 this week. Both mean people are actually having a bad time.
  const [appErrors24h, worstLcpP75] = mongo
    ? await Promise.all([getAppErrorCount24h(), getWorstLcpP75()])
    : [0, null];
  return NextResponse.json(
    {
      status: mongo ? 'ok' : 'degraded',
      mongo,
      version: pkg.version,
      cspViolations24h,
      appErrors24h,
      worstLcpP75,
      // Netlify sets COMMIT_REF; GitHub Actions sets GITHUB_SHA
      commit: (process.env.COMMIT_REF ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 12),
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
    { status: mongo ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
