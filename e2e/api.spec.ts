import { test, expect } from '@playwright/test';
import { currentTotpCode } from './helpers/totp';

// The webServer (playwright.config.ts) runs with ADMIN_TOKEN=e2e-admin-token
const TOKEN = 'e2e-admin-token';

// M26: the public read endpoints answer conditional requests, so an unchanged
// payload costs a 304 instead of a body.
test('guestbook GET answers If-None-Match with 304', async ({ request }) => {
  const first = await request.get('/api/guestbook?limit=5');
  expect(first.status()).toBe(200);
  expect(first.headers()['cache-control']).toContain('no-cache');
  const etag = first.headers()['etag'];
  expect(etag).toBeTruthy();

  // Other tests write entries in parallel, which rotates the ETag mid-test —
  // retry the pair until a revalidation happens on an unchanged payload.
  await expect(async () => {
    const fresh = await request.get('/api/guestbook?limit=5');
    const tag = fresh.headers()['etag'];
    const revalidated = await request.get('/api/guestbook?limit=5', {
      headers: { 'If-None-Match': tag },
    });
    expect(revalidated.status()).toBe(304);
    expect((await revalidated.body()).length).toBe(0);
  }).toPass({ timeout: 15000 });
});

test('boss leaderboard answers If-None-Match with 304', async ({ request }) => {
  const first = await request.get('/api/boss-scores');
  expect(first.status()).toBe(200);
  const etag = first.headers()['etag'];
  expect(etag).toBeTruthy();

  const revalidated = await request.get('/api/boss-scores', {
    headers: { 'If-None-Match': etag },
  });
  expect(revalidated.status()).toBe(304);
});

// M28: what the monitor and the post-deploy smoke test rely on.
test('health reports version, uptime, commit and Mongo state', async ({ request }) => {
  const res = await request.get('/api/health');
  expect([200, 503]).toContain(res.status());
  expect(res.headers()['cache-control']).toContain('no-store');
  const body = await res.json();
  expect(typeof body.mongo).toBe('boolean');
  expect(body.status).toBe(body.mongo ? 'ok' : 'degraded');
  expect(res.status()).toBe(body.mongo ? 200 : 503);
  expect(typeof body.version).toBe('string');
  expect(typeof body.commit).toBe('string');
  expect(typeof body.uptime).toBe('number');
});

// M27: the overview splits into two halves the dashboard can render
// independently — and never sits in a shared cache (M26).
test('admin overview splits into stats and moderation sections', async ({ request }) => {
  const login = await request.post('/api/admin/session', {
    headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' },
    data: { token: TOKEN, code: await currentTotpCode() },
  });
  expect(login.ok()).toBe(true);

  const stats = await request.get('/api/admin/overview?section=stats');
  expect(stats.status()).toBe(200);
  expect(stats.headers()['cache-control']).toContain('no-store');
  const statsBody = await stats.json();
  expect(Array.isArray(statsBody.links)).toBe(true);
  expect(Array.isArray(statsBody.daily)).toBe(true);
  expect(statsBody.guestbook).toBeUndefined();

  const moderation = await request.get('/api/admin/overview?section=moderation');
  expect(moderation.status()).toBe(200);
  const moderationBody = await moderation.json();
  expect(Array.isArray(moderationBody.guestbook)).toBe(true);
  expect(Array.isArray(moderationBody.audit)).toBe(true);
  expect(moderationBody.links).toBeUndefined();
});

// K54: violation reports arrive in two shapes — the legacy `csp-report` object
// that report-uri sends, and the Reporting API array that report-to sends,
// which is also how the report-only Trusted Types policy speaks. Both must be
// accepted, anything else rejected, and a report must never 500.
test('CSP reports are accepted in both reporting generations', async ({ request }) => {
  const legacy = await request.post('/api/csp-report', {
    data: {
      'csp-report': {
        'violated-directive': 'script-src',
        'blocked-uri': 'https://example.com/blocked.js',
        'document-uri': 'http://localhost:3000/',
      },
    },
  });
  expect(legacy.status()).toBe(204);

  const reportingApi = await request.post('/api/csp-report', {
    headers: { 'content-type': 'application/reports+json' },
    data: JSON.stringify([
      {
        type: 'csp-violation',
        body: {
          effectiveDirective: 'img-src',
          blockedURL: 'https://example.com/blocked.png',
          documentURL: 'http://localhost:3000/',
        },
      },
      {
        type: 'trusted-types-sink-violation',
        body: { sink: 'Element innerHTML', documentURL: 'http://localhost:3000/' },
      },
    ]),
  });
  expect(reportingApi.status()).toBe(204);

  const garbage = await request.post('/api/csp-report', { data: { nothing: 'to see here' } });
  expect(garbage.status()).toBe(400);
});
