import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  ADMIN_SESSION_COOKIE,
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

test('guardAdmin returns 503 when ADMIN_TOKEN is not configured', async () => {
  const saved = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  try {
    assert.equal((await guardAdmin(new Request('http://localhost/')))?.status, 503);
  } finally {
    process.env.ADMIN_TOKEN = saved;
  }
});

test('guardAdmin accepts the right bearer token and rejects others', async () => {
  const good = new Request('http://localhost/', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(await guardAdmin(good), null);

  const wrong = new Request('http://localhost/', { headers: { authorization: 'Bearer nope' } });
  assert.equal((await guardAdmin(wrong))?.status, 401);

  assert.equal((await guardAdmin(new Request('http://localhost/')))?.status, 401);
});

test('cookie sessions fail closed: expired, tampered and unknown ones are 401', async () => {
  // Correctly signed but expired — the same forgery the clock will make
  const expiredExp = Date.now() - 1000;
  const signedExpired = `${expiredExp}.abcdef.${createHmac('sha256', TOKEN)
    .update(`${expiredExp}.abcdef`)
    .digest('hex')}`;
  assert.equal((await guardAdmin(withCookies({ [ADMIN_SESSION_COOKIE]: signedExpired })))?.status, 401);

  // Right shape, wrong signature
  const future = Date.now() + 60_000;
  const tampered = `${future}.abcdef.deadbeef`;
  assert.equal((await guardAdmin(withCookies({ [ADMIN_SESSION_COOKIE]: tampered })))?.status, 401);

  // Well-signed but the registry is unreachable in this process — prove
  // nothing, allow nothing (M61)
  const signed = `${future}.abcdef.${createHmac('sha256', TOKEN).update(`${future}.abcdef`).digest('hex')}`;
  assert.equal((await guardAdmin(withCookies({ [ADMIN_SESSION_COOKIE]: signed })))?.status, 401);
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
