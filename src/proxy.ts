import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 1. Guard against direct API calls for click counter from unknown origins
  if (request.nextUrl.pathname.startsWith('/api/click-link-counter')) {
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    
    // In production, you'd check against your actual domain
    const isValidOrigin = 
      (origin && origin.includes(request.nextUrl.host)) || 
      (referer && referer.includes(request.nextUrl.host));

    // If it's neither coming from our site's referer nor origin, block it at the edge
    if (!isValidOrigin && process.env.NODE_ENV === 'production') {
      return new NextResponse('Forbidden: Invalid Origin blocked at Edge', { status: 403 });
    }
  }

  // 2. Add security headers dynamically if needed
  const requestHeaders = new Headers(request.headers);
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    connect-src 'self' https: wss:;
    worker-src 'self' blob:;
  `.replace(/\s{2,}/g, ' ').trim();

  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
