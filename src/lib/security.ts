import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

// The session registry lives in Mongo. The import stays dynamic on purpose:
// the Bearer paths (and their unit tests) must never pull a database into the
// module graph just to check a header.
async function sessionRegistry() {
  return import('@/connections/mongodb');
}

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
// Async since M61: cookie sessions are checked against the revocation registry.
export async function guardAdmin(request: Request, options: { csrf?: boolean } = {}): Promise<Response | null> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return new Response('Admin not configured', { status: 503 });
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (bearer) return safeEqual(bearer, expected) ? null : new Response('Unauthorized', { status: 401 });
  if (!(await validSession(request))) return new Response('Unauthorized', { status: 401 });
  if (options.csrf && !validCsrf(request)) return new Response('Bad CSRF token', { status: 403 });
  return null;
}

export function verifyAdminToken(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && token && safeEqual(token, expected));
}

// ---------- Admin browser session (R6, M61) ----------
// The cookie is signed (HMAC keyed on ADMIN_TOKEN) and carries a session id
// that must exist in the Mongo registry — that is what makes "revoke this
// session" possible at all. Cookie sessions therefore need Mongo (fail
// CLOSED: an unreachable registry cannot prove a session is still allowed);
// the Bearer path above stays Mongo-free for scripts. CSRF keeps the
// double-submit pattern: a separate readable cookie the client must echo in
// the x-csrf-token header — a cross-site attacker can send the cookie
// (SameSite=Strict mostly stops that anyway) but cannot read it.
export const ADMIN_SESSION_COOKIE = 'kotree-admin-session';
export const ADMIN_CSRF_COOKIE = 'kotree-csrf';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function hmac(value: string): string {
  return createHmac('sha256', process.env.ADMIN_TOKEN ?? '').update(value).digest('hex');
}

function hashUserAgent(request: Request): string {
  return createHash('sha256').update(request.headers.get('user-agent') ?? '').digest('hex').slice(0, 16);
}

// M61: ADMIN_BIND_UA=1 pins each session to the browser that opened it
function uaBindingEnabled(): boolean {
  return process.env.ADMIN_BIND_UA === '1';
}

export async function createAdminSession(request: Request): Promise<{ session: string; csrf: string; maxAgeSec: number }> {
  const exp = Date.now() + SESSION_TTL_MS;
  const id = randomBytes(16).toString('hex');
  const { createAdminSessionDoc } = await sessionRegistry();
  await createAdminSessionDoc(id, new Date(exp), uaBindingEnabled() ? hashUserAgent(request) : undefined);
  return {
    session: `${exp}.${id}.${hmac(`${exp}.${id}`)}`,
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

// The session id from the request cookie, when the cookie is well-formed and
// signed — used by the sessions API to mark "this device".
export function currentSessionId(request: Request): string | null {
  const raw = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!raw) return null;
  const [exp, id, sig] = raw.split('.');
  if (!exp || !id || !sig || !/^\d+$/.test(exp)) return null;
  return safeEqual(sig, hmac(`${exp}.${id}`)) ? id : null;
}

async function validSession(request: Request): Promise<boolean> {
  const raw = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!raw) return false;
  const [exp, id, sig] = raw.split('.');
  if (!exp || !id || !sig) return false;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  if (!safeEqual(sig, hmac(`${exp}.${id}`))) return false;
  try {
    const { isAdminSessionLive, touchAdminSession } = await sessionRegistry();
    const live = await isAdminSessionLive(id, uaBindingEnabled() ? hashUserAgent(request) : undefined);
    if (!live) return false;
    // Best-effort heartbeat; a failed write must not fail the request
    void touchAdminSession(id).catch(() => {});
    return true;
  } catch {
    return false; // registry unreachable: prove nothing, allow nothing
  }
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
