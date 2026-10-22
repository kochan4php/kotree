import { NextResponse } from 'next/server';
import { getAppErrorCount24h, getUptimeDays, getWorstLcpP75 } from '@/connections/mongodb';
import { uptimeBars, uptimeSummary } from '@/lib/uptime';

export const dynamic = 'force-dynamic';

// P12: one machine-readable place for the promises this site makes about
// itself. The heartbeat strip measures monitor coverage, not request-level
// availability; the response says so instead of pretending otherwise.
export async function GET() {
  const [days, lcp, errors] = await Promise.all([
    getUptimeDays(30).catch(() => []),
    getWorstLcpP75(7).catch(() => null),
    getAppErrorCount24h().catch(() => 0),
  ]);
  const uptime = uptimeSummary(uptimeBars(days, new Date(), 30));
  const coverage = uptime.total > 0 ? Math.round((uptime.covered / uptime.total) * 1000) / 10 : 0;

  return NextResponse.json(
    {
      targets: { monitorCoverage: 99.5, lcpP75: 2500, appErrors24h: 5 },
      current: { monitorCoverage: coverage, lcpP75: lcp, appErrors24h: errors },
      met: {
        monitorCoverage: coverage >= 99.5,
        lcpP75: lcp !== null && lcp <= 2500,
        appErrors24h: errors <= 5,
      },
      note: 'Coverage counts days with at least one health heartbeat; a missing day is not proof of downtime.',
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
