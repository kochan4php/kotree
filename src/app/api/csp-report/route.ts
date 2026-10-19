import { NextResponse } from 'next/server';
import { addClientError } from '@/connections/mongodb';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_LEN = { directive: 100, blocked: 300, document: 300 };

interface ReportEntry {
  type: string;
  directive: string;
  blocked: string;
  document: string;
}

const str = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');

// Two generations of report land here: the legacy `csp-report` object that
// report-uri sends, and the Reporting API's array of {type, body} entries that
// report-to sends — which is also how Trusted Types violations arrive. Both
// are flattened to the same shape so the admin's error stream reads the same.
function toEntries(parsed: unknown): ReportEntry[] {
  const entries: ReportEntry[] = [];

  if (Array.isArray(parsed)) {
    for (const raw of parsed.slice(0, 10)) {
      const entry = raw as { type?: unknown; body?: Record<string, unknown> } | null;
      const body = entry?.body;
      if (!body || typeof body !== 'object') continue;
      entries.push({
        type: str(entry?.type, MAX_LEN.directive) || 'report',
        directive:
          str(body.effectiveDirective, MAX_LEN.directive) ||
          str(body.violatedDirective, MAX_LEN.directive),
        // Trusted Types bodies name the sink that rejected the string instead
        blocked: str(body.blockedURL, MAX_LEN.blocked) || str(body.sink, MAX_LEN.blocked),
        document: str(body.documentURL, MAX_LEN.document),
      });
    }
    return entries;
  }

  const report = (parsed as { 'csp-report'?: Record<string, unknown> } | null)?.['csp-report'];
  if (!report || typeof report !== 'object') return entries;
  entries.push({
    type: 'csp-report',
    directive:
      str(report['violated-directive'], MAX_LEN.directive) ||
      str(report['effective-directive'], MAX_LEN.directive),
    blocked: str(report['blocked-uri'], MAX_LEN.blocked),
    document: str(report['document-uri'], MAX_LEN.document),
  });
  return entries;
}

// K54: CSP violations land here (report-uri and report-to in the proxy's
// policy) and join the client-error stream the admin dashboard already reads.
// Browsers send these with no Origin header, so the origin guard does not
// apply — rate limiting keeps the endpoint cheap.
export async function POST(request: Request) {
  if (await isRateLimited(`csp:${getClientIp(request)}`, 20)) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const entries = toEntries(parsed);
  if (entries.length === 0) return new NextResponse(null, { status: 400 });

  try {
    await Promise.all(
      entries.map((entry) =>
        addClientError({
          message: `CSP ${entry.directive || entry.type}${
            entry.blocked ? ` blocked ${entry.blocked}` : ''
          }`.slice(0, 500),
          source: 'csp',
          url: entry.document || undefined,
        })
      )
    );
  } catch {
    // Never fail report delivery on a storage hiccup
  }

  return new NextResponse(null, { status: 204 });
}
