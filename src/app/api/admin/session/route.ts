import { NextResponse } from 'next/server';
import {
  adminSessionCookies,
  clearAdminSessionCookies,
  createAdminSession,
  currentSessionId,
  guardAdmin,
  guardOrigin,
  verifyAdminToken,
} from '@/lib/security';
import { addAudit, claimRecoveryCode, revokeAdminSession } from '@/connections/mongodb';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { sha256Hex, verifyTotp } from '@/lib/totp';

export const dynamic = 'force-dynamic';

const tooMany = () => new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });

function recoveryHashes(): string[] {
  return (process.env.ADMIN_TOTP_RECOVERY ?? '')
    .split(',')
    .map((hash) => hash.trim().toLowerCase())
    .filter(Boolean);
}

// Log in: exchange the admin token (+ the second factor, when configured) for
// an HttpOnly session cookie + a readable CSRF cookie. The token itself is
// never stored client-side afterwards.
export async function POST(request: Request) {
  // A sign-in with the second factor on costs two requests (token first, then
  // token+code); the ceiling still leaves brute force hopeless.
  if (await isRateLimited(`admin-login:${getClientIp(request)}`, 20)) return tooMany();

  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  if (!process.env.ADMIN_TOKEN) return new NextResponse('Admin not configured', { status: 503 });

  let body: { token?: unknown; code?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  if (!verifyAdminToken(token)) {
    await addAudit('login_failed', undefined, getClientIp(request)).catch(() => {});
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // M60: a second factor whenever ADMIN_TOTP_SECRET is set. The client learns
  // it needs a code from the JSON error, so the form can reveal the field.
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (totpSecret) {
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) return NextResponse.json({ error: 'totp_required' }, { status: 401 });
    if (!(await verifyTotp(totpSecret, code))) {
      // A recovery code is accepted exactly once: the sha256 in the env must
      // match AND the burn-row insert must win the race for that hash.
      const hash = await sha256Hex(code);
      const usable = recoveryHashes().includes(hash) && (await claimRecoveryCode(hash));
      if (!usable) {
        await addAudit('login_totp_failed', undefined, getClientIp(request)).catch(() => {});
        return NextResponse.json({ error: 'totp_invalid' }, { status: 401 });
      }
      await addAudit('login_recovery_used', undefined, getClientIp(request)).catch(() => {});
    }
  }

  await addAudit('login_ok', undefined, getClientIp(request)).catch(() => {});
  const values = await createAdminSession(request);
  const res = NextResponse.json({ ok: true });
  for (const cookie of adminSessionCookies(request, values)) res.headers.append('Set-Cookie', cookie);
  return res;
}

// Log out: revoke this session in the registry and clear both cookies.
// CSRF-protected like every cookie mutation.
export async function DELETE(request: Request) {
  const forbidden = await guardAdmin(request, { csrf: true });
  if (forbidden) return forbidden;

  const id = currentSessionId(request);
  if (id) await revokeAdminSession(id).catch(() => {});
  await addAudit('logout', undefined, getClientIp(request)).catch(() => {});
  const res = NextResponse.json({ ok: true });
  for (const cookie of clearAdminSessionCookies(request)) res.headers.append('Set-Cookie', cookie);
  return res;
}
