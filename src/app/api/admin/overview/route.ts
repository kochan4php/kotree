import { NextResponse } from 'next/server';
import {
  getLinkCounts,
  getGuestbookAdminEntries,
  getDailyClickCounts,
  getClientErrors,
} from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Throttle before the token check: slows down brute force
  if (await isRateLimited(`admin:${getClientIp(request)}`, 20)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const forbidden = guardAdmin(request);
  if (forbidden) return forbidden;

  try {
    const [links, guestbook, daily, errors] = await Promise.all([
      getLinkCounts(),
      getGuestbookAdminEntries(),
      // Trend + error feed are nice-to-have: an empty chart beats a 500
      getDailyClickCounts(14).catch(() => []),
      getClientErrors(10).catch(() => []),
    ]);
    const sorted = links.sort((a, b) => b.count - a.count);
    const totalClicks = sorted.reduce((sum, l) => sum + l.count, 0);
    return NextResponse.json({ totalClicks, links: sorted, guestbook, daily, errors });
  } catch {
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
