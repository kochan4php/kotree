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
