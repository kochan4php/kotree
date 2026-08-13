import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 1. Guard against direct API calls for click counter from unknown origins.
  //    POST only: GET is public read-only data (the counters used to be
  //    server-rendered into the HTML for everyone).
  if (request.method === 'POST' && request.nextUrl.pathname.startsWith('/api/click-link-counter')) {
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
    script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://avatars.githubusercontent.com https://win98icons.alexmeub.com;
    font-src 'self';
    media-src 'self' blob:;
    connect-src 'self' https://ipapi.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
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
