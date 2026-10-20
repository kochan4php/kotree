import { test, expect, type Page } from '@playwright/test';

// Reading comfort is a P9 addition: it changes note bodies only, never the
// surrounding UI, and survives a reload through the same prefs store.
async function openNote(page: Page) {
  await page.goto('/notes/2025-11-15-offline-first-without-a-framework');
  await page.waitForSelector('html[data-theme]');
}

test('P9: reading controls resize the note body and persist', async ({ page }) => {
  await openNote(page);
  const body = page.locator('.e-content p').first();
  const before = await body.evaluate((el) => getComputedStyle(el).fontSize);

  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByRole('button', { name: 'Increase text size' }).click();
  await expect(page.locator('html')).toHaveCSS('--reading-scale', '1.1');
  expect(await body.evaluate((el) => getComputedStyle(el).fontSize)).not.toBe(before);

  await page.getByRole('button', { name: 'Readable font' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-readable-font', 'on');

  await page.reload();
  await page.waitForSelector('html[data-theme]');
  await expect(page.locator('html')).toHaveAttribute('data-readable-font', 'on');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kotree-prefs') ?? '{}'));
  expect(stored.textScale).toBeGreaterThan(1);
});
