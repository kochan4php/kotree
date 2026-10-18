import { NextResponse } from 'next/server';
import { getAuditEvents, getAuditLog } from '@/connections/mongodb';
import { guardAdmin } from '@/lib/security';
import { adminRateLimited } from '@/lib/rate-limit';
import { toCsv } from '@/lib/audit-csv';

export const dynamic = 'force-dynamic';

// M67: the audit log with an action-type filter and a CSV download. JSON by
// default; `?format=csv` streams a spreadsheet-friendly file.
export async function GET(request: Request) {
  const limited = await adminRateLimited('read', request);
  if (limited) return limited;

  const forbidden = await guardAdmin(request);
  if (forbidden) return forbidden;

  const params = new URL(request.url).searchParams;
  const event = params.get('event') ?? '';
  const wantsCsv = params.get('format') === 'csv';

  try {
    const [entries, events] = await Promise.all([getAuditLog(wantsCsv ? 1000 : 100, event), getAuditEvents()]);
    if (wantsCsv) {
      return new NextResponse(toCsv(entries), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="kotree-audit.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json({ entries, events });
  } catch {
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 });
  }
}
