import { NextResponse } from 'next/server';
import {
  getLinkCounts,
  getGuestbookAdminEntries,
  getDailyClickCounts,
  getClientErrors,
  getVitalsP75,
  getPageViews,
  getAuditLog,
} from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// M27: the dashboard fetches the two halves separately so each set of panels
// renders as soon as its data lands (a slow moderation query no longer blocks
// the click stats). No `section` returns everything, for the session probe.
export async function GET(request: Request) {
  // Throttle before the token check: slows down brute force
  if (await isRateLimited(`admin:${getClientIp(request)}`, 60)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const forbidden = guardAdmin(request);
  if (forbidden) return forbidden;

  const section = new URL(request.url).searchParams.get('section');
  const wantStats = section !== 'moderation';
  const wantModeration = section !== 'stats';

  try {
    const [links, guestbook, daily, errors, vitals, pageviews, audit] = await Promise.all([
      wantStats ? getLinkCounts() : null,
      wantModeration ? getGuestbookAdminEntries() : null,
      // Trend + side panels are nice-to-have: an empty chart beats a 500
      wantStats ? getDailyClickCounts(14).catch(() => []) : null,
      wantModeration ? getClientErrors(10).catch(() => []) : null,
      wantStats ? getVitalsP75(7).catch(() => []) : null,
      wantStats ? getPageViews(7).catch(() => []) : null,
      wantModeration ? getAuditLog(30).catch(() => []) : null,
    ]);

    const payload: Record<string, unknown> = {};
    if (links) {
      const sorted = links.sort((a, b) => b.count - a.count);
      payload.totalClicks = sorted.reduce((sum, l) => sum + l.count, 0);
      payload.links = sorted;
      payload.daily = daily;
      payload.vitals = vitals;
      payload.pageviews = pageviews;
    }
    if (guestbook) {
      payload.guestbook = guestbook;
      payload.errors = errors;
      payload.audit = audit;
    }

    // M26: admin data is per-request and behind a cookie — never cacheable
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
