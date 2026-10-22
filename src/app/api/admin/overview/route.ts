import { NextResponse } from 'next/server';
import {
  getLinkCounts,
  getGuestbookAdminEntries,
  getDailyClickCounts,
  getClientErrors,
  getVitalsP75,
  getPageViews,
  getAuditLog,
  getAuditEvents,
  loginAlertCount,
  getTopCspViolations,
  getActivePoll,
  getAdminWebmentions,
} from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { adminRateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// M27: the dashboard fetches the two halves separately so each set of panels
// renders as soon as its data lands (a slow moderation query no longer blocks
// the click stats). No `section` returns everything, for the session probe.
export async function GET(request: Request) {
  const limited = await adminRateLimited('read', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request);
  if (forbidden) return forbidden;

  const section = new URL(request.url).searchParams.get('section');
  const wantStats = section !== 'moderation';
  const wantModeration = section !== 'stats';

  try {
    const [links, guestbook, daily, errors, vitals, pageviews, audit, auditEvents, csp, poll, loginAlert, webmentions] =
      await Promise.all([
      wantStats ? getLinkCounts() : null,
      wantModeration ? getGuestbookAdminEntries() : null,
      // Trend + side panels are nice-to-have: an empty chart beats a 500
      wantStats ? getDailyClickCounts(14).catch(() => []) : null,
      wantModeration ? getClientErrors(10).catch(() => []) : null,
      wantStats ? getVitalsP75(7).catch(() => []) : null,
      wantStats ? getPageViews(7).catch(() => []) : null,
      wantModeration ? getAuditLog(30).catch(() => []) : null,
      // M67: action types for the audit filter
      wantModeration ? getAuditEvents().catch(() => []) : null,
      // M65: CSP violations are the sharp end of the client-error stream
      wantStats ? getTopCspViolations(5).catch(() => []) : null,
      // M44: the active poll (if any) rides in the moderation payload
      wantModeration ? getActivePoll().catch(() => null) : null,
      // H8: a burst of failed sign-ins, or null when it is quiet
      wantModeration ? loginAlertCount().catch(() => null) : null,
      // P13: the webmention inbox lives with moderation
      wantModeration ? getAdminWebmentions().catch(() => []) : null,
    ]);

    const payload: Record<string, unknown> = {};
    if (links) {
      const sorted = links.sort((a, b) => b.count - a.count);
      payload.totalClicks = sorted.reduce((sum, l) => sum + l.count, 0);
      payload.links = sorted;
      payload.daily = daily;
      payload.vitals = vitals;
      payload.pageviews = pageviews;
      payload.csp = csp;
    }
    if (guestbook) {
      payload.guestbook = guestbook;
      payload.errors = errors;
      payload.audit = audit;
      payload.auditEvents = auditEvents;
      payload.poll = poll;
      payload.loginAlert = loginAlert;
      payload.webmentions = webmentions;
    }

    // M26: admin data is per-request and behind a cookie — never cacheable
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
