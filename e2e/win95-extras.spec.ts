import { test, expect, type Page } from '@playwright/test';

// G7: the parts of Windows 95 that outlive the window you left them in —
// remembered window positions, the Start menu with Display Properties and
// Shut Down, and the screensaver that drifts in after a quiet minute.

async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function bootWin95(page: Page) {
  await page.goto('/');
  await waitHydrated(page);
  // Same activation path as the terminal's `win95` command
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95')));
  await expect(page.getByRole('button', { name: 'Minesweeper' })).toBeVisible({ timeout: 10000 });
}

test('windows come back where they were left', async ({ page }) => {
  await bootWin95(page);

  // Exact match: the taskbar button for the same window reads "Calculator.exe"
  const icon = page.getByRole('button', { name: 'Calculator', exact: true });
  await icon.focus();
  await page.keyboard.press('Enter');

  const bar = page.getByRole('group', { name: /Move Calculator\.exe/ });
  await expect(bar).toBeVisible();
  const frame = bar.locator('xpath=..');
  // The window's own left offset, not a screenshot coordinate: the slide after
  // each move makes bounding boxes lag behind the state.
  const left = async () =>
    Number.parseFloat(await frame.evaluate((el) => (el as HTMLElement).style.left));

  await page.waitForTimeout(200);
  const opened = await left();

  // Arrow keys move the window — the accessible alternative to dragging
  await bar.focus();
  for (let step = 0; step < 3; step += 1) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  expect(Math.abs((await left()) - (opened + 48))).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Close Calculator.exe' }).click();
  await expect(bar).toHaveCount(0);

  await icon.focus();
  await page.keyboard.press('Enter');
  await expect(bar).toBeVisible();
  // Positions are remembered to the nearest pixel, so allow the rounding
  await page.waitForTimeout(200);
  expect(Math.abs((await left()) - (opened + 48))).toBeLessThanOrEqual(1);
});

test('the Start menu shuts the machine down, and any key brings it back', async ({ page }) => {
  await bootWin95(page);

  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Shut Down' }).click();

  await expect(page.getByText('now safe to turn off your computer')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Minesweeper' })).toHaveCount(0);
});

test('the desktop colour is a choice that sticks', async ({ page }) => {
  await bootWin95(page);

  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Display Properties' }).click();

  const dialog = page.getByRole('dialog', { name: 'Display Properties' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Plum' }).click();
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByTestId('win95-desktop')).toHaveCSS('background-color', 'rgb(75, 46, 90)');

  // A fresh page starts the shell again, and the choice comes back with it
  await bootWin95(page);
  await expect(page.getByTestId('win95-desktop')).toHaveCSS('background-color', 'rgb(75, 46, 90)');
});

test('the Media Player owns its tiny chiptune', async ({ page }) => {
  await bootWin95(page);
  await page.getByRole('button', { name: 'Media Player', exact: true }).dblclick();
  await expect(page.getByRole('combobox', { name: 'Track' })).toHaveValue('boot');
  await page.getByRole('button', { name: 'Play track' }).click();
  await expect(page.getByText(/▶ playing/)).toBeVisible();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByText(/■ stopped/)).toBeVisible();
});

test('the screensaver drifts in after a quiet minute', async ({ page }) => {
  await page.clock.install();
  await bootWin95(page);

  const hint = page.getByText('Move the mouse or press any key to come back');
  await expect(hint).toHaveCount(0);

  await page.clock.fastForward(61_000);
  await expect(hint).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(hint).toHaveCount(0);
});
