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
