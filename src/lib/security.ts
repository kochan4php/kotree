import { createHash, timingSafeEqual } from 'crypto';

const allowedOrigins = new Set(
  [
    process.env.NEXT_PUBLIC_BASE_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter((origin): origin is string => Boolean(origin)),
);

export function guardOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const trusted = origin !== null && allowedOrigins.has(origin) && site === 'same-origin';
  return trusted ? null : new Response('Forbidden', { status: 403 });
}

// Generate a simple time-based CSRF token that rotates every hour
export function generateToken(): string {
  if (typeof window !== 'undefined') return ''; // Server only
  const timeSlice = Math.floor(Date.now() / (1000 * 60 * 60)); 
  const secret = process.env.NEXT_PUBLIC_BASE_URL || 'kotree';
  return btoa(`${timeSlice}:${secret}`).substring(0, 15);
}

export function validateToken(token: string | undefined): boolean {
  if (!token) return false;
  const timeSlice = Math.floor(Date.now() / (1000 * 60 * 60));
  const timeSlicePrev = timeSlice - 1; // Allow previous slice to prevent edge-case race conditions
  const secret = process.env.NEXT_PUBLIC_BASE_URL || 'kotree';
  
  const expected1 = btoa(`${timeSlice}:${secret}`).substring(0, 15);
  const expected2 = btoa(`${timeSlicePrev}:${secret}`).substring(0, 15);
  
  return token === expected1 || token === expected2;
}

// Constant-time string comparison via SHA-256 digests (equal length by definition)
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

// Bearer-token guard for admin API routes. Returns null when the request is
// valid; a Response otherwise (503 = ADMIN_TOKEN not configured, 401 = bad token).
export function guardAdmin(request: Request): Response | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return new Response('Admin not configured', { status: 503 });
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token && safeEqual(token, expected) ? null : new Response('Unauthorized', { status: 401 });
}
