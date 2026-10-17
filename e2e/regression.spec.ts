import { test, expect } from '@playwright/test';

// Hydration race: event listeners attach only after React hydrates the page.
// A fixed wait flakes under machine load — poll the service worker registration
// (its effect only runs post-hydration) as a deterministic hydration gate.
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
      /* SW is not the point of most tests — fall through to a grace wait */
      swConfirmed = false;
    });
  // SW registration is the strongest hydration signal; without it, wait longer
  await page.waitForTimeout(swConfirmed ? 300 : 2500);
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

test('search: X closes on mobile, Esc works, and the palette is global', async ({ page }) => {
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
  // the command palette now lives on every page, changelog included
  await page.getByRole('link', { name: /changelog/i }).click();
  await expect(page).toHaveURL(/.*changelog/);
  await page.getByRole('button', { name: 'Search links' }).click();
  await expect(page.getByRole('textbox', { name: 'Search links' })).toBeVisible();
  await page.keyboard.press('Escape');
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
  const konami = async () => {
    for (const k of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) {
      await page.keyboard.press(k);
    }
  };
  const exit = page.getByRole('button', { name: 'EXIT BOSS FIGHT' });
  await konami();
  if (!(await exit.isVisible())) {
    // First sequence raced a slow hydration commit — one more attempt.
    // (Harmless if the fight is already on: extra keys are ignored.)
    await page.waitForTimeout(500);
    await konami();
  }
  // Assert the moment it appears: the fight ends on death/win, so sleeping a
  // fixed interval first made this flaky (stationary players used to die ~1.5s in)
  await expect(exit).toBeVisible({ timeout: 10000 });
  await exit.click();
  await expect(exit).toHaveCount(0);
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

test('guestbook load more appends the next page', async ({ page }) => {
  // Stub the API with 12 entries served in pages of 10 + 2
  const all = Array.from({ length: 12 }, (_, i) => ({
    message: `cipher-${i}`,
    createdAt: new Date(Date.now() - i * 60_000).toISOString(),
  }));
  await page.route('**/api/guestbook?*', async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const before = url.searchParams.get('before');
    const start = before ? all.findIndex((e) => e.createdAt === before) + 1 : 0;
    await route.fulfill({ json: all.slice(start, start + limit) });
  });

  await page.goto('/');
  await waitHydrated(page);

  await expect(page.getByText('cipher-9')).toBeVisible();
  await expect(page.getByText('cipher-10')).toHaveCount(0);

  const loadMore = page.getByRole('button', { name: 'Load more secrets' });
  await expect(loadMore).toBeVisible();
  await loadMore.click();

  await expect(page.getByText('cipher-11')).toBeVisible();
  // 12 < 20 loaded so far → the button must retire
  await expect(loadMore).toHaveCount(0);
});
