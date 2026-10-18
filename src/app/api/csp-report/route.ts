import { NextResponse } from 'next/server';
import { addClientError } from '@/connections/mongodb';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_LEN = { directive: 100, blocked: 300, document: 300 };

// K54: CSP violation reports land here (report-uri in the proxy's policy) and
// join the client-error stream the admin dashboard already reads. Browsers
// send these with no Origin header, so the origin guard does not apply —
// rate limiting keeps the endpoint cheap.
export async function POST(request: Request) {
  if (await isRateLimited(`csp:${getClientIp(request)}`, 20)) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let body: { 'csp-report'?: Record<string, unknown> };
  try {
    body = (await request.json()) as { 'csp-report'?: Record<string, unknown> };
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const report = body['csp-report'];
  if (!report || typeof report !== 'object') return new NextResponse(null, { status: 400 });

  const str = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');
  const directive =
    str(report['violated-directive'], MAX_LEN.directive) ||
    str(report['effective-directive'], MAX_LEN.directive);
  const blocked = str(report['blocked-uri'], MAX_LEN.blocked);
  const documentUri = str(report['document-uri'], MAX_LEN.document);

  try {
    await addClientError({
      message: `CSP ${directive || 'violation'}${blocked ? ` blocked ${blocked}` : ''}`.slice(0, 500),
      source: 'csp',
      url: documentUri || undefined,
    });
  } catch {
    // Never fail report delivery on a storage hiccup
  }

  return new NextResponse(null, { status: 204 });
}
