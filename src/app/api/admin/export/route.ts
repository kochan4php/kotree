import { NextResponse } from 'next/server';
import { getLinkCounts, getGuestbookAdminEntries, getDailyClickCounts, getClientErrors } from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Full JSON backup of everything the admin can see (R42). Complements
// scripts/backup-data.mjs: this one works from a browser session.
export async function GET(request: Request) {
  if (isRateLimited(`admin:${getClientIp(request)}`, 20)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const forbidden = guardAdmin(request);
  if (forbidden) return forbidden;

  try {
    const [links, daily, guestbook, errors] = await Promise.all([
      getLinkCounts(),
      getDailyClickCounts(90),
      getGuestbookAdminEntries(1000),
      getClientErrors(200),
    ]);
    const sorted = links.sort((a, b) => b.count - a.count);
    const payload = {
      exportedAt: new Date().toISOString(),
      totals: {
        clicks: sorted.reduce((sum, l) => sum + l.count, 0),
        guestbook: guestbook.length,
        errors: errors.length,
      },
      links: sorted,
      daily,
      guestbook,
      errors,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="kotree-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
