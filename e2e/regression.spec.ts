import { test, expect } from '@playwright/test';

// Hydration race: event listeners attach only after React hydrates the page.
// A fixed wait flakes under machine load — poll the service worker registration
// (its effect only runs post-hydration) as a deterministic hydration gate.
async function waitHydrated(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page
    .waitForFunction(
      () => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)),
      null,
      { timeout: 10000 }
    )
    .catch(() => {
      /* SW is not the point of most tests — fall through to a grace wait */
    });
  await page.waitForTimeout(300);
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

test('search: X closes on mobile, Esc still works, hidden on changelog', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Search links' }).click();
  await expect(page.getByRole('textbox', { name: 'Search links' })).toBeVisible();
  // mobile path: X button (mobile keyboards have no Escape key)
  await page.getByRole('button', { name: 'Close search' }).click();
  await expect(page.getByRole('textbox', { name: 'Search links' })).toHaveCount(0);
  // desktop path: Escape still closes
  await page.getByRole('button', { name: 'Search links' }).click();
  await expect(page.getByRole('textbox', { name: 'Search links' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Search links' })).toHaveCount(0);
  // changelog has no search button (nothing to search there)
  await page.getByRole('link', { name: /changelog/i }).click();
  await expect(page).toHaveURL(/.*changelog/);
  await expect(page.getByRole('button', { name: 'Search links' })).toHaveCount(0);
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

test('guestbook removes the optimistic entry when the server rejects', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  // Force every guestbook POST to fail with an HTTP error (not a network error)
  await page.evaluate(() => {
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).includes('/api/guestbook') && init?.method === 'POST'
        ? Promise.resolve(new Response('{"error":"forced"}', { status: 500 }))
        : orig(input, init);
  });
  const before = await page.locator('[role="button"]').count();
  await page.getByLabel('Secret message').fill('ghost test');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForTimeout(1500);
  const after = await page.locator('[role="button"]').count();
  expect(after).toBe(before); // optimistic entry appeared then reverted
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
