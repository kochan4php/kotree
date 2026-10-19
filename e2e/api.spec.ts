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
  // H2: the alert workflow reads these two from the same anonymous request
  expect(typeof body.appErrors24h).toBe('number');
  expect(body.worstLcpP75 === null || typeof body.worstLcpP75 === 'number').toBe(true);
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

// H3: Trusted Types stays report-only (ADR 0004). The header is the whole
// mechanism, so a test pins it in place — and pins enforcement out.
test('the CSP carries the report-only Trusted Types policy', async ({ request }) => {
  const response = await request.get('/');
  const reportOnly = response.headers()['content-security-policy-report-only'] ?? '';
  expect(reportOnly).toContain("require-trusted-types-for 'script'");
  expect(reportOnly).toContain('report-to default');
  expect(response.headers()['content-security-policy'] ?? '').not.toContain('require-trusted-types-for');
});

// G5: the public stats JSON mirrors the numbers page and stays cacheable.
test('the public stats JSON carries the numbers and a cache header', async ({ request }) => {
  const response = await request.get('/api/stats.json');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('s-maxage=60');
  const body = (await response.json()) as {
    generatedAt?: string;
    totalClicks?: number;
    last30Days?: unknown[];
  };
  expect(typeof body.generatedAt).toBe('string');
  expect(typeof body.totalClicks).toBe('number');
  expect(Array.isArray(body.last30Days)).toBe(true);
});

// G3: the repository card's route guards its input before it ever reaches
// GitHub, so a hostile slug can never be reflected into the upstream URL.
test('the repository route only accepts an owner/name slug', async ({ request }) => {
  for (const bad of ['', 'kotree', 'https://github.com/kochan4php/kotree', '../../etc/passwd', 'a b/c']) {
    const response = await request.get(`/api/repo-stats?repo=${encodeURIComponent(bad)}`);
    expect(response.status(), bad || '(empty)').toBe(400);
  }
});

// H6: the Origin guard covers every route that can write, not just the three
// the threat model names. A request with no origin header is refused with 403
// before tokens, honeypots or rate limits get a say.
test('every mutating route refuses a request that did not come from the site', async ({ request }) => {
  const guarded = [
    { method: 'post' as const, route: '/api/boss-scores' },
    { method: 'post' as const, route: '/api/chat' },
    { method: 'post' as const, route: '/api/click-link-counter' },
    { method: 'post' as const, route: '/api/guestbook' },
    { method: 'post' as const, route: '/api/guestbook/report' },
    { method: 'post' as const, route: '/api/log' },
    { method: 'post' as const, route: '/api/pageview' },
    { method: 'post' as const, route: '/api/poll' },
    { method: 'post' as const, route: '/api/reactions' },
  ];

  for (const { method, route } of guarded) {
    const response = await request[method](route, { data: {} });
    expect(response.status(), `${method} ${route}`).toBe(403);
  }

  // The login route refuses a request with no browser metadata at the CSRF
  // layer, before it ever reads the token.
  expect((await request.post('/api/admin/session', { data: {} })).status()).toBe(403);

  // The authenticated admin routes ask who you are first, so a signed-out
  // caller is refused at the session check (401) and never reaches the CSRF
  // half of guardAdmin. Either answer means nothing was written.
  const adminGuarded = [
    { method: 'post' as const, route: '/api/admin/poll' },
    { method: 'post' as const, route: '/api/admin/sessions' },
    { method: 'patch' as const, route: '/api/admin/errors' },
    { method: 'patch' as const, route: '/api/admin/guestbook' },
  ];

  for (const { method, route } of adminGuarded) {
    const response = await request[method](route, { data: {} });
    expect(response.status(), `${method} ${route}`).toBe(401);
  }

  // The one exception: browsers post CSP reports with no fetch metadata, so it
  // validates the shape instead of the origin.
  expect((await request.post('/api/csp-report', { data: { nothing: true } })).status()).toBe(400);
});
