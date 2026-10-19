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

  // WebKit can still be hydrating after networkidle on a loaded machine, so the
  // click is retried until the palette actually mounts (see admin.spec.ts).
  const search = page.getByRole('textbox', { name: 'Search links' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Search links' }).click();
    await expect(search).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });

  await search.fill('theme');
  await expect(page.getByText('Cycle theme')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
});

// I3: the Win95 shell is plain DOM — the same Start menu and the same modal on
// every engine. A pointer drag proves use-drag's pointer capture travels, and
// Display Properties proves the dialog is a real dialog.
async function bootWin95(page: Page) {
  await page.goto('/');
  await waitHydrated(page);
  // Dispatch can land before hydration under load; retry until the shell mounts
  await expect(async () => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95')));
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

test('the Win95 Start menu opens Display Properties and Escape closes it @crossbrowser', async ({ page }) => {
  await bootWin95(page);

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: /Display Properties/ }).click();

  const dialog = page.getByRole('dialog', { name: 'Display Properties' });
  await expect(dialog).toBeVisible();

  // The colour has a name for screen readers, and the choice sticks
  await dialog.getByRole('button', { name: 'Navy' }).click();
  await expect(dialog.getByRole('button', { name: 'Navy' })).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('a Win95 window follows a pointer drag @crossbrowser', async ({ page }) => {
  await bootWin95(page);

  const icon = page.getByRole('button', { name: 'Calculator', exact: true });
  await icon.focus();
  await page.keyboard.press('Enter');

  const bar = page.getByRole('group', { name: /Move Calculator\.exe/ });
  await expect(bar).toBeVisible();
  const frame = bar.locator('xpath=..');
  const left = async () =>
    Number.parseFloat(await frame.evaluate((el) => (el as HTMLElement).style.left));

  // Let the open transition settle before measuring
  await page.waitForTimeout(600);
  const opened = await left();
  const box = await bar.boundingBox();
  if (!box) throw new Error('the Calculator title bar has no box');

  // Grab the empty left half of the title bar, away from the window buttons
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + box.height / 2 + 40, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  expect(await left()).toBeGreaterThanOrEqual(opened + 40);
});
