import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  generateToken,
  guardAdmin,
  validateToken,
  verifyAdminToken,
} from '../../src/lib/security.ts';

const TOKEN = 'unit-test-token';
process.env.ADMIN_TOKEN = TOKEN;

function withCookies(cookies: Record<string, string>): Request {
  const header = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new Request('http://localhost/api/admin/overview', { headers: { cookie: header } });
}

test('guardAdmin returns 503 when ADMIN_TOKEN is not configured', () => {
  const saved = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  try {
    assert.equal(guardAdmin(new Request('http://localhost/'))?.status, 503);
  } finally {
    process.env.ADMIN_TOKEN = saved;
  }
});

test('guardAdmin accepts the right bearer token and rejects others', () => {
  const good = new Request('http://localhost/', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(guardAdmin(good), null);

  const wrong = new Request('http://localhost/', { headers: { authorization: 'Bearer nope' } });
  assert.equal(wrong ? guardAdmin(wrong)?.status : 0, 401);

  assert.equal(guardAdmin(new Request('http://localhost/'))?.status, 401);
});

test('a fresh session passes; expired and tampered ones do not', () => {
  const { session } = createAdminSession();
  assert.equal(guardAdmin(withCookies({ [ADMIN_SESSION_COOKIE]: session })), null);

  // A correctly signed but expired session (same forgery the clock will make)
  const expiredExp = Date.now() - 1000;
  const signedExpired = `${expiredExp}.${createHmac('sha256', TOKEN).update(String(expiredExp)).digest('hex')}`;
  assert.equal(guardAdmin(withCookies({ [ADMIN_SESSION_COOKIE]: signedExpired }))?.status, 401);

  const future = Date.now() + 60_000;
  const tampered = `${future}.deadbeef`;
  assert.equal(guardAdmin(withCookies({ [ADMIN_SESSION_COOKIE]: tampered }))?.status, 401);
});

test('cookie mutations need the CSRF double-submit pair', () => {
  const { session, csrf } = createAdminSession();

  const noCsrf = withCookies({ [ADMIN_SESSION_COOKIE]: session });
  assert.equal(guardAdmin(noCsrf, { csrf: true })?.status, 403);

  const good = new Request('http://localhost/api/admin/guestbook', {
    headers: {
      cookie: `${ADMIN_SESSION_COOKIE}=${session}; ${ADMIN_CSRF_COOKIE}=${csrf}`,
      'x-csrf-token': csrf,
    },
  });
  assert.equal(guardAdmin(good, { csrf: true }), null);

  const mismatched = new Request('http://localhost/api/admin/guestbook', {
    headers: {
      cookie: `${ADMIN_SESSION_COOKIE}=${session}; ${ADMIN_CSRF_COOKIE}=${csrf}`,
      'x-csrf-token': 'other',
    },
  });
  assert.equal(guardAdmin(mismatched, { csrf: true })?.status, 403);
});

test('the hourly form token validates for this hour and the last, not older', () => {
  assert.equal(validateToken(generateToken()), true);
  assert.equal(validateToken('garbage'), false);
  assert.equal(validateToken(undefined), false);

  const twoHoursAgo = Math.floor(Date.now() / 3_600_000) - 2;
  const stale = btoa(`${twoHoursAgo}:kotree`).substring(0, 15);
  assert.equal(validateToken(stale), false);

  assert.equal(verifyAdminToken(TOKEN), true);
  assert.equal(verifyAdminToken('no'), false);
});
