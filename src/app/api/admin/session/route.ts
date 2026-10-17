import { NextResponse } from 'next/server';
import {
  adminSessionCookies,
  clearAdminSessionCookies,
  createAdminSession,
  guardAdmin,
  guardOrigin,
  verifyAdminToken,
} from '@/lib/security';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const tooMany = () => new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });

// Log in: exchange the admin token for an HttpOnly session cookie + a readable
// CSRF cookie. The token itself is never stored client-side afterwards.
export async function POST(request: Request) {
  // Tighter limit than the generic admin bucket: slows down token guessing
  if (isRateLimited(`admin-login:${getClientIp(request)}`, 10)) return tooMany();

  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  if (!process.env.ADMIN_TOKEN) return new NextResponse('Admin not configured', { status: 503 });

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  if (!verifyAdminToken(token)) return new NextResponse('Unauthorized', { status: 401 });

  const values = createAdminSession();
  const res = NextResponse.json({ ok: true });
  for (const cookie of adminSessionCookies(request, values)) res.headers.append('Set-Cookie', cookie);
  return res;
}

// Log out: clear both cookies. CSRF-protected like every cookie mutation.
export async function DELETE(request: Request) {
  const forbidden = guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  const res = NextResponse.json({ ok: true });
  for (const cookie of clearAdminSessionCookies(request)) res.headers.append('Set-Cookie', cookie);
  return res;
}
