import { test, expect, type Page } from '@playwright/test';

// Same gate the other suites use: type only once the app has hydrated, or the
// value can be lost to the hydration pass on a loaded machine.
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

// /search is server-rendered on purpose: the same results reach a crawler, a
// curl and a browser with JavaScript switched off, and the form is a plain GET
// so a result set can be linked and shared.
test('search results are in the server HTML, no JavaScript needed', async ({ request }) => {
  const found = await request.get('/search?q=offline');
  expect(found.status()).toBe(200);
  const html = await found.text();
  expect(html).toContain('/notes/2026-10-12-offline-first');
  expect(html).toMatch(/1 match|matches/);

  const empty = await request.get('/search?q=zzzzzzzz');
  expect(empty.status()).toBe(200);
  expect(await empty.text()).toContain('Nothing matched');

  // A fuzzy subsequence still lands: "plte" is inside "palette"
  const fuzzy = await request.get('/search?q=oftr');
  expect(await fuzzy.text()).toContain('/notes/2026-10-12-offline-first');
});

test('the search form navigates to a shareable URL', async ({ page }) => {
  await page.goto('/search');
  await waitHydrated(page);
  await page.getByLabel('Search notes and projects').fill('offline');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page).toHaveURL(/\/search\?q=offline/);
  await expect(page.getByRole('link', { name: /Offline, on purpose/ })).toBeVisible();
});
