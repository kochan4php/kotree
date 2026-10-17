import { NextResponse } from 'next/server';
import { getLinkCounts, getGuestbookAdminEntries } from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Throttle before the token check: slows down brute force
  if (isRateLimited(`admin:${getClientIp(request)}`, 20)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const forbidden = guardAdmin(request);
  if (forbidden) return forbidden;

  try {
    const [links, guestbook] = await Promise.all([getLinkCounts(), getGuestbookAdminEntries()]);
    const sorted = links.sort((a, b) => b.count - a.count);
    const totalClicks = sorted.reduce((sum, l) => sum + l.count, 0);
    return NextResponse.json({ totalClicks, links: sorted, guestbook });
  } catch {
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
