import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { currentTotpCode } from './helpers/totp';

// The webServer (playwright.config.ts) runs with ADMIN_TOKEN=e2e-admin-token
const TOKEN = 'e2e-admin-token';

// Same hydration gate as regression.spec.ts: fill()+click() before React
// hydrates leaves the Connect button disabled forever under machine load.
async function waitHydrated(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  let swConfirmed = true;
  await page
    .waitForFunction(
      () => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)),
      null,
      { timeout: 10000 }
    )
    .catch(() => {
      swConfirmed = false;
    });
  await page.waitForTimeout(swConfirmed ? 300 : 2500);
}

test('admin rejects a wrong token', async ({ page }) => {
  await page.goto('/admin');
  await waitHydrated(page);
  await page.getByLabel('Admin token').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText('Wrong token.')).toBeVisible({ timeout: 10000 });
});

// H8: a failed sign-in is audited, and a run of them is shouted about on the
// dashboard. The e2e server lowers the threshold to one, so this stays a single
// attempt and never leans on the sign-in rate limit.
test('a failed sign-in raises the dashboard alert', async ({ page }) => {
  await page.goto('/admin');
  await waitHydrated(page);

  await page.getByLabel('Admin token').fill('wrong-once');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText('Wrong token.')).toBeVisible({ timeout: 10000 });

  await page.getByLabel('Admin token').fill(TOKEN);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  const codeField = page.getByLabel('2FA code');
  await codeField.waitFor({ state: 'visible', timeout: 10000 });
  await codeField.fill(await currentTotpCode());
  await page.getByRole('button', { name: 'Connect', exact: true }).click();

  await expect(page.getByText(/failed sign-ins in the last 24 hours/)).toBeVisible({ timeout: 15000 });
});

test('admin loads the overview with the configured token', async ({ page }) => {  await page.goto('/admin');
  await waitHydrated(page);
  await page.getByLabel('Admin token').fill(TOKEN);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  // M60: the second factor is on in the e2e server — complete the login
  const codeField = page.getByLabel('2FA code');
  await codeField.waitFor({ state: 'visible', timeout: 10000 });
  await codeField.fill(await currentTotpCode());
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clicks by link' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toBeVisible();
  // Logging out returns to the token form
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByLabel('Admin token')).toBeVisible();
});

// Opens /admin and lands on the moderation view. The session cookie survives
// within the test, so the token form only appears on the first visit. M60: the
// server enforces the second factor, so a first login completes in two steps.
async function openAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin');
  await waitHydrated(page);
  // Wait for the silent session probe to resolve into one of the two states
  await page
    .getByLabel('Admin token')
    .or(page.getByText('Connected.'))
    .first()
    .waitFor({ timeout: 10000 });
  const tokenField = page.getByLabel('Admin token');
  if (await tokenField.isVisible()) {
    await tokenField.fill(TOKEN);
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    // Wait for the code field OR the moderation view — under load the
    // roundtrip can take a while, and a five-second guess here is a flake.
    const codeField = page.getByLabel('2FA code');
    const moderation = page.getByRole('heading', { name: 'Guestbook moderation' });
    await codeField.or(moderation).first().waitFor({ timeout: 15000 });
    if (await codeField.isVisible()) {
      await codeField.fill(await currentTotpCode());
      await page.getByRole('button', { name: 'Connect', exact: true }).click();
    }
  }
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toBeVisible({ timeout: 15000 });
}

// The sign-in endpoint buckets per IP (20/min) and every browser request in
// the suite would otherwise share one 'unknown' bucket under load: each test
// gets its own address, like real visitors do.
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({
    'x-forwarded-for': `10.9.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`,
  });
});

test('admin can pin a guestbook entry, and the wall shows it featured', async ({ page }) => {
  // Seed one entry through the public API so moderation always has a target
  const marker = `pin-me-${Date.now()}`;
  await page.goto('/');
  const seeded = await page.evaluate(async (message) => {
    const token = btoa(`${Math.floor(Date.now() / 3600000)}:kotree`).substring(0, 15);
    const res = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, _token: token }),
    });
    return res.status;
  }, marker);
  expect(seeded).toBe(200);

  await openAdmin(page);
  await page.getByLabel('Filter guestbook').fill(marker);
  const row = page.locator('li', { hasText: marker });
  await row.getByRole('button', { name: 'Pin entry' }).click();
  await expect(page.getByText('Entry pinned to the top')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Unpin entry' })).toBeVisible();

  // The public wall shows pinned entries as featured
  await page.goto('/guestbook');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('FEATURED').first()).toBeVisible();

  // Put the wall back the way we found it: unpin, delete the seed entry
  await openAdmin(page);
  await page.getByLabel('Filter guestbook').fill(marker);
  const rowAgain = page.locator('li', { hasText: marker });
  await rowAgain.getByRole('button', { name: 'Unpin entry' }).click();
  await expect(page.getByText('Entry unpinned')).toBeVisible();
  await rowAgain.getByRole('button', { name: 'Delete entry' }).click();
  await expect(page.getByText('Entry deleted')).toBeVisible();
});

// K53: the exports must contain the real data, not just start a download.
test('admin exports carry real JSON and CSV payloads', async ({ page }) => {
  await openAdmin(page);

  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON backup' }).click(),
  ]);
  const jsonPath = await jsonDownload.path();
  if (!jsonPath) throw new Error('JSON export produced no file');

  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  expect(typeof payload.exportedAt).toBe('string');
  expect(Array.isArray(payload.links)).toBe(true);
  expect(Array.isArray(payload.guestbook)).toBe(true);
  expect(payload.totals.guestbook).toBe(payload.guestbook.length);

  const [csvDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ]);
  const csvPath = await csvDownload.path();
  if (!csvPath) throw new Error('CSV export produced no file');

  const csv = readFileSync(csvPath, 'utf8');
  expect(csv.split('\r\n')[0]).toBe('"id","createdAt","message","userAgent"');
});

test('admin mutations without the CSRF header are rejected', async ({ page }) => {
  await openAdmin(page);

  const withoutToken = await page.evaluate(async () => {
    const res = await fetch('/api/admin/guestbook', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'missing', pinned: true }),
    });
    return res.status;
  });
  expect(withoutToken).toBe(403);

  // The double-submit pair passes the CSRF gate (the row itself does not exist)
  const withToken = await page.evaluate(async () => {
    const csrf =
      document.cookie
        .split('; ')
        .find((c) => c.startsWith('kotree-csrf='))
        ?.slice('kotree-csrf='.length) ?? '';
    const res = await fetch('/api/admin/guestbook', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify({ id: 'missing', pinned: true }),
    });
    return res.status;
  });
  expect(withToken).not.toBe(403);
});

test('an expired admin session falls back to the token form', async ({ page, context }) => {
  // The session value is `exp.id.hmac` (M61); the server is the clock
  // authority, so an expired cookie is signed here exactly as the app would.
  const exp = Date.now() - 60_000;
  const id = 'deadbeefdeadbeefdeadbeefdeadbeef';
  const signature = createHmac('sha256', TOKEN).update(`${exp}.${id}`).digest('hex');
  await context.addCookies([
    { name: 'kotree-admin-session', value: `${exp}.${id}.${signature}`, url: 'http://localhost:3000' },
  ]);

  await page.goto('/admin');
  await waitHydrated(page);

  await expect(page.getByLabel('Admin token')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toHaveCount(0);

  const status = await page.evaluate(() => fetch('/api/admin/overview').then((res) => res.status));
  expect(status).toBe(401);
});

// M60: with ADMIN_TOTP_SECRET set, the token alone is not enough.
test('the login asks for the 2FA code and rejects a wrong one', async ({ page }) => {
  await page.goto('/admin');
  await waitHydrated(page);

  await page.getByLabel('Admin token').fill(TOKEN);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();

  const codeField = page.getByLabel('2FA code');
  await expect(codeField).toBeVisible({ timeout: 10000 });

  // A malformed code can never match, whatever the clock says
  await codeField.fill('12345');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText('Invalid 2FA code.')).toBeVisible({ timeout: 10000 });

  // The real code lets the same form through
  await codeField.fill(await currentTotpCode());
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toBeVisible({ timeout: 15000 });
});

// M61: the registry lists live browser sessions and can revoke them.
test('the sessions card marks this browser and revoking it signs out', async ({ page }) => {
  await openAdmin(page);

  await expect(page.getByRole('heading', { name: 'Active sessions' })).toBeVisible({ timeout: 15000 });
  const currentRow = page.locator('li', { hasText: 'this device' });
  await expect(currentRow).toHaveCount(1, { timeout: 15000 });

  await currentRow.getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByText('Session revoked — signing out')).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel('Admin token')).toBeVisible();

  // The revoked cookie is dead everywhere, not just in the UI
  const status = await page.evaluate(() => fetch('/api/admin/overview').then((res) => res.status));
  expect(status).toBe(401);
});

// M67: the audit log filters by action and exports what is on screen.
test('the audit log filters by action and exports a CSV', async ({ page }) => {
  await openAdmin(page);

  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible({ timeout: 15000 });
  await page.getByLabel('Filter by action').selectOption('login_ok');
  // This very test just logged in, so the filter always has at least one row
  // (scoped to the list items — the <option> above carries the same text)
  await expect(page.locator('li', { hasText: 'login ok' }).first()).toBeVisible({ timeout: 10000 });

  const [csvDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export audit CSV' }).click(),
  ]);
  const csvPath = await csvDownload.path();
  if (!csvPath) throw new Error('Audit export produced no file');

  const csv = readFileSync(csvPath, 'utf8');
  expect(csv.split('\r\n')[0]).toBe('at,event,detail,ipHash');
  expect(csv).toContain('login_ok');
});

// M62: writes share a per-IP budget three times tighter than reads.
test('admin writes are rate limited per IP with a Retry-After hint', async ({ page }) => {
  test.setTimeout(90_000); // waiting out one minute boundary is the worst case
  await openAdmin(page);

  // The limiter counts in fixed wall-clock minutes, so a burst that straddles
  // a boundary never adds up (part of it lands in the next bucket). Start just
  // after a fresh boundary and all 40 attempts share one bucket.
  await page.waitForFunction(() => Date.now() % 60_000 < 2_000, null, { timeout: 65_000, polling: 1_000 });

  const result = await page.evaluate(async () => {
    const csrf =
      document.cookie
        .split('; ')
        .find((c) => c.startsWith('kotree-csrf='))
        ?.slice('kotree-csrf='.length) ?? '';
    // Unique per run: the limiter buckets by the last X-Forwarded-For hop
    const xff = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
    for (let attempt = 1; attempt <= 40; attempt++) {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf,
          'x-forwarded-for': xff,
        },
        body: JSON.stringify({ id: 'beefdead' }),
      });
      if (res.status === 429) return { attempts: attempt, retryAfter: res.headers.get('retry-after') };
    }
    return null;
  });

  // 30 writes fit the window, the 31st is refused
  expect(result?.attempts).toBe(31);
  expect(result?.retryAfter).toBe('60');
});
