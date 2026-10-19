import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

// K56: paths that only scanners ask for. Answering 404 here avoids paying for a
// render and keeps probe noise out of the analytics.
const PROBE_PATHS = [
  /^\/\.env/,
  /^\/\.git(\/|$)/,
  /^\/\.aws(\/|$)/,
  /^\/\.ssh(\/|$)/,
  /^\/wp-(admin|login|content|includes|json)/,
  /^\/wp-.*\.php$/,
  /^\/xmlrpc\.php$/,
  /^\/phpmyadmin/,
  /^\/vendor\/phpunit/,
  /^\/\.DS_Store$/,
  /^\/config\.(json|php|ya?ml)$/,
];

// Best-effort, per proxy instance (Edge functions are short-lived): enough to
// stop one noisy scanner from becoming a log flood, not a security control.
const probeHits = new Map<string, { count: number; resetAt: number }>();
const PROBE_LIMIT = 5;
const PROBE_WINDOW_MS = 10 * 60_000;

function probeIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',').pop()!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function shouldTrapProbe(pathname: string): boolean {
  return PROBE_PATHS.some((pattern) => pattern.test(pathname));
}

// K54: per-response nonce. Next passes the nonce in `x-nonce` to the renderer
// and stamps it onto its own inline scripts; the root layout adds it to ours.
function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const httpsDeployment =
    process.env.NETLIFY === 'true' || (process.env.NEXT_PUBLIC_BASE_URL ?? '').startsWith('https://');

  return [
    "default-src 'self'",
    // M65: 'wasm-unsafe-eval' stays — the Doom engine (wasm-engine.tsx) runs
    // WebAssembly, and dropping the directive would break it for a threat
    // (JIT spray through hand-written wasm) that cannot execute without an
    // injection in the first place. Evaluated, kept, documented.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com",
    "font-src 'self'",
    "media-src 'self' blob:",
    "connect-src 'self' https://ipapi.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(httpsDeployment ? ['upgrade-insecure-requests'] : []),
    "worker-src 'self' blob:",
    // M65: both reporting generations — report-to is what Chromium reads now,
    // report-uri is the fallback every other engine still uses
    'report-to default',
    'report-uri /api/csp-report',
  ].join('; ');
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (shouldTrapProbe(pathname)) {
    const ip = probeIp(request);
    const now = Date.now();
    const bucket = probeHits.get(ip);
    const active = bucket && bucket.resetAt > now;
    const count = active ? bucket.count + 1 : 1;
    if (probeHits.size > 5000) probeHits.clear(); // bound memory on a bad day
    probeHits.set(ip, { count, resetAt: active ? bucket.resetAt : now + PROBE_WINDOW_MS });

    if (count > PROBE_LIMIT) return new NextResponse(null, { status: 429 });

    // Log through the existing client-error pipeline; the 404 must not wait.
    event.waitUntil(
      fetch(new URL('/api/log', request.url), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: request.nextUrl.origin,
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify({
          message: `probe ${pathname}`,
          source: 'probe',
          url: pathname.slice(0, 300),
        }),
      }).catch(() => {})
    );
    return new NextResponse(null, { status: 404 });
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  // Next reads the CSP from the request headers and stamps the nonce onto its
  // own inline scripts; the layout reads x-nonce for the two scripts we own.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  // M65: the group the policy's `report-to default` points at
  response.headers.set('reporting-endpoints', 'default="/api/csp-report"');
  // Trusted Types, report-only: this policy only ever sends reports, and with
  // the nonce plus 'strict-dynamic' above there are no inline strings left to
  // trust. The point is to see what would break before enforcing anything —
  // the reports join the same client-error stream as the CSP ones.
  response.headers.set(
    'content-security-policy-report-only',
    "require-trusted-types-for 'script'; report-to default"
  );
  return response;
}

export const config = {
  matcher: [
    // HTML and the probe surface only: skip API routes, Next internals, the
    // worker and every static file (but not dotfiles like /.env, which the
    // extension list below deliberately does not cover).
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|robots.txt|sitemap.xml|.*\\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|css|js|json|xml|txt|webmanifest)$).*)',
  ],
};
