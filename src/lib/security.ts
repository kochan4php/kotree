import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

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
// Accepts either the Bearer token (curl/scripts) or a browser session cookie.
// Cookie mutations must additionally pass the CSRF double-submit check; a
// Bearer caller cannot be CSRF'd, so the header is not required there.
export function guardAdmin(request: Request, options: { csrf?: boolean } = {}): Response | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return new Response('Admin not configured', { status: 503 });
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (bearer) return safeEqual(bearer, expected) ? null : new Response('Unauthorized', { status: 401 });
  if (!validSession(request)) return new Response('Unauthorized', { status: 401 });
  if (options.csrf && !validCsrf(request)) return new Response('Bad CSRF token', { status: 403 });
  return null;
}

export function verifyAdminToken(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && token && safeEqual(token, expected));
}

// ---------- Admin browser session (R6) ----------
// Stateless session: expiry + HMAC(expiry) keyed on ADMIN_TOKEN, delivered as
// an HttpOnly cookie so page scripts (and XSS) can never read it. CSRF uses
// the double-submit pattern: a separate readable cookie that the client must
// echo in the x-csrf-token header — a cross-site attacker can send the cookie
// (SameSite=Strict mostly stops that anyway) but cannot read it to set the header.
export const ADMIN_SESSION_COOKIE = 'kotree-admin-session';
export const ADMIN_CSRF_COOKIE = 'kotree-csrf';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function hmac(value: string): string {
  return createHmac('sha256', process.env.ADMIN_TOKEN ?? '').update(value).digest('hex');
}

export function createAdminSession(): { session: string; csrf: string; maxAgeSec: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  return {
    session: `${exp}.${hmac(String(exp))}`,
    csrf: randomBytes(16).toString('hex'),
    maxAgeSec: SESSION_TTL_MS / 1000,
  };
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1);
  }
  return null;
}

function validSession(request: Request): boolean {
  const raw = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!raw) return false;
  const dot = raw.indexOf('.');
  if (dot <= 0) return false;
  const exp = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmac(exp));
}

function validCsrf(request: Request): boolean {
  const cookie = readCookie(request, ADMIN_CSRF_COOKIE);
  const header = request.headers.get('x-csrf-token');
  return Boolean(cookie && header && safeEqual(cookie, header));
}

function isSecureRequest(request: Request): boolean {
  return (
    (request.headers.get('x-forwarded-proto') ?? '').includes('https') ||
    new URL(request.url).protocol === 'https:'
  );
}

export function adminSessionCookies(
  request: Request,
  values: { session: string; csrf: string; maxAgeSec: number },
): string[] {
  const secure = isSecureRequest(request) ? '; Secure' : '';
  const base = `Path=/; Max-Age=${values.maxAgeSec}; SameSite=Strict${secure}`;
  return [
    `${ADMIN_SESSION_COOKIE}=${values.session}; HttpOnly; ${base}`,
    `${ADMIN_CSRF_COOKIE}=${values.csrf}; ${base}`,
  ];
}

export function clearAdminSessionCookies(request: Request): string[] {
  const secure = isSecureRequest(request) ? '; Secure' : '';
  return [
    `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`,
    `${ADMIN_CSRF_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`,
  ];
}
