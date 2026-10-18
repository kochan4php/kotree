import { test, expect, type Page } from '@playwright/test';

// Same hydration gate as regression.spec.ts: clicking a link while the
// hydration commit swaps the anchor out can lose the click under machine load.
async function waitHydrated(page: Page) {
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

test('has title and profile info', async ({ page }) => {
  await page.goto('/');

  // Check title
  await expect(page).toHaveTitle(/Kotree/);

  // Check if profile card is visible
  const name = page.getByRole('heading', { name: 'Deo Subarno' });
  await expect(name).toBeVisible();

  // Check if links are rendered
  const githubLink = page.getByRole('link', { name: /github/i });
  await expect(githubLink).toBeVisible();
});

test('can navigate to changelog', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  // Find the changelog link in footer or main page
  const changelogLink = page.getByRole('link', { name: /changelog/i });
  await expect(changelogLink).toBeVisible();

  await changelogLink.click();
  await expect(page).toHaveURL(/.*changelog/);

  // Verify changelog page loaded
  await expect(page.getByRole('heading', { name: 'Changelog' })).toBeVisible();
});
