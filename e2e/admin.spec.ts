import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

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

test('admin loads the overview with the configured token', async ({ page }) => {
  await page.goto('/admin');
  await waitHydrated(page);
  await page.getByLabel('Admin token').fill(TOKEN);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clicks by link' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toBeVisible();
  // Logging out returns to the token form
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByLabel('Admin token')).toBeVisible();
});

// Opens /admin and lands on the moderation view. The session cookie survives
// within the test, so the token form only appears on the first visit.
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
  }
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toBeVisible({ timeout: 15000 });
}

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
  // The session value is `exp.hmac`; the server is the clock authority, so an
  // expired cookie is signed here exactly as the app would have signed it.
  const exp = Date.now() - 60_000;
  const signature = createHmac('sha256', TOKEN).update(String(exp)).digest('hex');
  await context.addCookies([
    { name: 'kotree-admin-session', value: `${exp}.${signature}`, url: 'http://localhost:3000' },
  ]);

  await page.goto('/admin');
  await waitHydrated(page);

  await expect(page.getByLabel('Admin token')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toHaveCount(0);

  const status = await page.evaluate(() => fetch('/api/admin/overview').then((res) => res.status));
  expect(status).toBe(401);
});
