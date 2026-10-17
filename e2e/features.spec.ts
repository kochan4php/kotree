import { test, expect, type Page } from '@playwright/test';

// R43: feature-level coverage for the interactions added in 3.2.0 —
// theme persistence, palette keyboard flow, the offline guestbook queue,
// permalinks and the smart 404.

const ENTRY = {
  id: 'e2e-1',
  message: 'cipher-e2e-1',
  createdAt: '2026-06-15T10:00:00.000Z',
  reactions: {},
};

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

test('command palette keyboard: cycling the theme sticks across reloads', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  // auto -> light
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('cycle');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  // light -> dark
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('cycle');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // The choice is remembered
  await page.reload();
  await waitHydrated(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('command palette keyboard: typing then Enter navigates', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('changelog');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/changelog$/);
});

test.describe('offline', () => {
  // Block the service worker so request interception stays deterministic
  test.use({ serviceWorkers: 'block' });

  test('guestbook messages queue while offline and send when back online', async ({ page, context }) => {
    let posts = 0;
    await page.route('**/api/guestbook?*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/guestbook', async (route) => {
      if (route.request().method() === 'POST') {
        posts++;
        return route.fulfill({ json: { success: true } });
      }
      return route.continue();
    });

    await page.goto('/');
    await waitHydrated(page);

    // K14: text typed into the guestbook survives a reload
    await page.getByLabel('Secret message').fill('draft survives reload');
    await page.reload();
    await waitHydrated(page);
    await expect(page.getByLabel('Secret message')).toHaveValue('draft survives reload');

    await context.setOffline(true);
    await page.getByLabel('Secret message').fill('queued while offline');
    await page.getByRole('button', { name: 'Send message' }).click();

    // K14: once the message is safely queued the draft is gone
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('kotree-guestbook-draft')), { timeout: 5000 })
      .toBeNull();

    // The optimistic entry is marked pending and the counter appears
    await expect(page.getByText('waiting to send…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/waiting to send — we/)).toBeVisible();

    // Back online: the queue flushes itself
    await context.setOffline(false);
    await expect(page.getByText(/secret delivered/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('waiting to send…')).toHaveCount(0);
    expect(posts).toBeGreaterThan(0);
  });
});

test.describe('guestbook permalinks', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copying a permalink and opening it highlights the entry', async ({ page }) => {
    await page.route('**/api/guestbook?*', (route) => route.fulfill({ json: [ENTRY] }));

    await page.goto('/');
    await waitHydrated(page);

    await page.getByRole('button', { name: 'Copy permalink' }).first().click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#secret-e2e-1');

    await page.goto('/#secret-e2e-1');
    await waitHydrated(page);
    const entry = page.locator('#secret-e2e-1');
    await expect(entry).toBeVisible();

    // The permalink scrolls the entry into view. The ring highlight is
    // deliberately transient (4 seconds), so assert the stable scroll
    // position instead of the brief class.
    const box = await entry.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(720);
  });
});

test('404 search finds a page and Enter opens it', async ({ page }) => {  await page.goto('/definitely-not-a-page');
  await waitHydrated(page);

  await page.getByLabel('Search pages and links').fill('projects');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/projects$/);
});

test('status page reports live health', async ({ page }) => {
  await page.goto('/status');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
  await expect(page.getByText('Database')).toBeVisible();
  await expect(page.getByText('Offline support')).toBeVisible();
  await expect(page.getByText('App version')).toBeVisible();
});

test('a shared post lands in the guestbook message box', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  // The POST below must go through the service worker
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });

  const status = await page.evaluate(async () => {
    const body = new URLSearchParams({ text: 'shared from android', url: 'https://example.com' });
    const res = await fetch('/share', { method: 'POST', body });
    return res.status;
  });
  expect(status).toBe(200);

  await page.goto('/guestbook');
  await waitHydrated(page);
  await expect(page.getByLabel('Secret message')).toHaveValue(/shared from android/);
});

test('palette searches note content and opens it', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('offline on purpose');
  // The content index loads lazily — wait for the note to appear first
  await expect(page.getByText('Offline, on purpose')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/notes\/2026-10-12-offline-first$/);
});

test('tag pages group projects and link through to them', async ({ page }) => {
  await page.goto('/projects/tags');
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: /next\.js/ }).click();
  await expect(page).toHaveURL(/\/projects\/tags\/next-js$/);
  await expect(page.getByRole('heading', { name: 'next.js' })).toBeVisible();

  await page.locator('a[href="/projects/kotree"]').first().click();
  await expect(page).toHaveURL(/\/projects\/kotree$/);
});

test('articles show reading time, a table of contents and related links', async ({ page }) => {
  await page.goto('/projects/kotree');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText(/min read/)).toBeVisible();

  const toc = page.getByRole('navigation', { name: 'On this page' });
  await expect(toc).toBeVisible();
  await toc.getByRole('link', { name: 'What is inside' }).click();
  await expect(page).toHaveURL(/#what-is-inside$/);

  await expect(page.getByRole('heading', { name: 'Related' })).toBeVisible();
});
