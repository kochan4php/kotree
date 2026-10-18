import { test, expect, type Page } from '@playwright/test';

// K44/K45: a small, stable slice that must work on every engine and on real
// phone viewports. Tagged tests are picked up by the firefox, webkit,
// mobile-pixel and mobile-iphone projects (see playwright.config.ts); the
// chromium project runs them too.

async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
}

test('home renders the profile card and primary links @crossbrowser @mobile', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await expect(page.getByRole('button', { name: 'Open AI Terminal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show QR Code' })).toBeVisible();
  await expect(page.getByRole('link', { name: /GitHub/ })).toBeVisible();
});

test('command palette opens, finds a command and closes @crossbrowser @mobile', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await page.getByRole('button', { name: 'Search links' }).click();
  const search = page.getByRole('textbox', { name: 'Search links' });
  await expect(search).toBeVisible();

  await search.fill('theme');
  await expect(page.getByText('Cycle theme')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
});
