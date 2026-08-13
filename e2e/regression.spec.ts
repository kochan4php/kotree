import { test, expect } from '@playwright/test';

// Hydration race: event listeners attach only after React hydrates the page
async function waitHydrated(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

test('service worker registers (PWA)', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  // Poll instead of fixed wait — registration is async and can be slow on a loaded machine
  await page.waitForFunction(
    () => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)),
    null,
    { timeout: 5000 }
  );
  const registered = await page.evaluate(() =>
    navigator.serviceWorker.getRegistration().then((r) => Boolean(r))
  );
  expect(registered).toBe(true);
});

test('search button in dock toggles search', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  const btn = page.getByRole('button', { name: 'Search links' });
  await btn.click();
  await expect(page.getByRole('textbox', { name: 'Search links' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Search links' })).toHaveCount(0);
});

test('QR modal lazy-loads and focuses close button', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Show QR Code' }).click();
  const dialog = page.getByRole('dialog', { name: 'QR Code' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close QR' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('focus returns to the trigger after the terminal closes', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Open AI Terminal' }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await expect(page.getByRole('button', { name: 'Open AI Terminal' })).toBeFocused();
});

test('boss fight can be exited (no trap)', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  // Konami code triggers the boss fight
  for (const k of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) {
    await page.keyboard.press(k);
  }
  await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: 'EXIT BOSS FIGHT' })).toBeVisible();
  await page.getByRole('button', { name: 'EXIT BOSS FIGHT' }).click();
  await page.waitForTimeout(400);
  await expect(page.getByRole('button', { name: 'EXIT BOSS FIGHT' })).toHaveCount(0);
});

test('clicking a link triggers a counts refresh', async ({ page }) => {
  let gets = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/click-link-counter') && req.method() === 'GET') gets++;
  });
  await page.goto('/');
  await waitHydrated(page);
  const before = gets;
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: /GitHub/ }).click();
  const popup = await popupPromise;
  await popup.close();
  await page.waitForTimeout(600);
  expect(gets).toBe(before + 1);
});
