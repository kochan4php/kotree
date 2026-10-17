import { test, expect } from '@playwright/test';

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
