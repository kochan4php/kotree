import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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
  const response = NextResponse.next();
  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/:path*',
};
