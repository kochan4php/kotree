import { test, expect } from '@playwright/test';

// Same hydration gate as the other specs: clicks before React hydrates go
// nowhere under machine load.
async function waitHydrated(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  let swConfirmed = true;
  await page
    .waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)), null, { timeout: 10000 })
    .catch(() => {
      swConfirmed = false;
    });
  await page.waitForTimeout(swConfirmed ? 300 : 2500);
}

// M68: the obfuscation step is client-side, so a JS-less visitor gets a
// honest explanation instead of a dead form.
test.describe('no-JS fallback', () => {
  test.use({ javaScriptEnabled: false });

  test('the guestbook explains why it needs JavaScript', async ({ page }) => {
    await page.goto('/guestbook');
    // Playwright's locators run in a JS-enabled isolated world where
    // <noscript> content is not part of the rendered tree, so assert on the
    // parsed HTML itself: with scripting off the browser shows this block.
    await expect(page.locator('noscript')).toHaveCount(1);
    expect(await page.content()).toContain('The guestbook needs JavaScript');
    expect(await page.content()).toContain('say hello through the usual channels');
  });
});

// M69: the generated splash screens are wired up and downloadable.
test('the manifest and splash screens are install-ready', async ({ page, request }) => {
  const links = page.locator('link[rel="apple-touch-startup-image"]');
  await page.goto('/');
  await expect(links).toHaveCount(6);
  for (const href of await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))) {
    const res = await request.get(href ?? '');
    expect(res.status(), href ?? '').toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }

  const manifest = await (await request.get('/manifest.json')).json();
  expect(manifest.launch_handler.client_mode).toBe('navigate-existing');
  expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(6);
});

// M70: haptics fire on success, on the same switch as the success sound.
test.describe('haptics', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('a successful copy buzzes on devices that support it', async ({ page }) => {
    await page.addInitScript(() => {
      const scope = window as unknown as { __vibrates: (number | number[])[] };
      scope.__vibrates = [];
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        value: (pattern: number | number[]) => {
          scope.__vibrates.push(pattern);
          return true;
        },
      });
    });

    await page.goto('/changelog');
    await waitHydrated(page);
    await page.locator('button[aria-label^="Copy link to version"]').first().click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __vibrates: unknown[] }).__vibrates.length))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as unknown as { __vibrates: unknown[] }).__vibrates)).toEqual([
      [12, 40, 12],
    ]);
  });
});

// M71: a downward swipe starting at the top of a dialog closes it.
test('swiping down on a dialog closes it', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Search links' }).click();
  const dialog = page.locator('#kt-palette-dialog');
  await expect(dialog).toBeVisible();

  await dialog.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const touch = (y: number) =>
      new Touch({ identifier: 1, target: node, clientX: rect.left + 60, clientY: y });
    node.dispatchEvent(
      new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch(rect.top + 12)] }),
    );
    node.dispatchEvent(
      new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [touch(rect.top + 120)],
      }),
    );
  });

  await expect(dialog).toHaveCount(0);
});

// M71: the year strip on /wrapped clicks and walks with the arrow keys.
test('the wrapped year strip walks with keys and clicks', async ({ page }) => {
  await page.goto('/wrapped');
  await waitHydrated(page);
  const carousel = page.getByRole('group', { name: 'Choose a year' });

  await carousel.getByRole('link', { name: '2022' }).click();
  await expect(page).toHaveURL(/year=2022/);
  await expect(page.getByRole('heading', { name: 'Kotree Wrapped 2022' })).toBeVisible();

  await carousel.getByRole('link', { name: '2022' }).focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('2023');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/year=2023/);
});

// M72: the palette and the wall never show a bare void.
test('the palette and the wall have friendly empty states', async ({ page, context }) => {
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('zzzqqq');
  await expect(page.getByText('Nothing found for')).toBeVisible();

  // The offline banner appears when the connection drops (M72)
  await page.goto('/guestbook');
  await waitHydrated(page);
  await context.setOffline(true);
  await expect(page.getByText("You're offline")).toBeVisible();
  await context.setOffline(false);
});
