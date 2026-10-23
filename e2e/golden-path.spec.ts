import { test, expect, type Page } from '@playwright/test';

// I8: the golden path — the whole walk a visitor actually takes, in one file.
// The other suites check each stop in depth; this one fails loudly if the road
// between them breaks.

// Same hydration gate the other suites use: a click or a typed value sent
// before the hydration commit can be lost under machine load.
async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle');
  let swConfirmed = true;
  await page
    .waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)), null, { timeout: 10000 })
    .catch(() => {
      swConfirmed = false;
    });
  await page.waitForTimeout(swConfirmed ? 300 : 2500);
}

// The palette takes a query and follows the first hit on Enter. The hits come
// from the search index, which loads on open: pressing Enter before it lands
// does nothing, so wait for a highlighted result instead of a fixed pause.
async function palette(page: Page, query: string) {
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill(query);
  await expect(page.locator('#kt-palette-list button[aria-current="true"]').first()).toBeVisible();
  await page.keyboard.press('Enter');
}

test('reads: home, the palette, a note and a project', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  await expect(page).toHaveTitle(/Kotree/);
  await expect(page.getByRole('heading', { name: 'Deo Subarno' })).toBeVisible();

  await palette(page, 'on purpose');
  await expect(page).toHaveURL(/\/notes\/2026-10-12-offline-first$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Offline, on purpose' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to your shelf' })).toBeVisible();

  await palette(page, 'projects');
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole('link', { name: /^Kotree/ }).first().click();
  await expect(page).toHaveURL(/\/projects\/kotree$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Kotree' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Print/ })).toBeVisible();
});

test('writes: a secret goes up on the wall and comes back from the server', async ({ page }) => {
  await page.goto('/guestbook');
  await waitHydrated(page);

  await page.getByLabel('Secret message').fill(`golden-${Date.now()}`);
  await page.getByRole('button', { name: 'Send message' }).click();

  // The optimistic entry adopts the server id once the POST has resolved
  const entry = page.locator('div[id^="secret-"]').first();
  await expect(entry).toHaveAttribute('id', /^secret-[a-f0-9]{24}$/, { timeout: 10000 });
  const id = (await entry.getAttribute('id'))!;

  // A reload drops every local copy. The id only exists server-side, so finding
  // it again means the wall really read it back.
  await page.reload();
  await waitHydrated(page);
  await expect(page.locator(`#${id}`)).toBeVisible({ timeout: 10000 });
});

test('a wrong address still lands somewhere useful', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { name: 'Sanctuary Lost' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Surprise me' })).toBeVisible();
});
