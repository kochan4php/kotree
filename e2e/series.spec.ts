import { test, expect } from '@playwright/test';

// Series are ordered collections added with the P10 content pass. The note
// page must say where the reader is, and the series page must keep order.
test('series index and ordered series navigation', async ({ page }) => {
  await page.goto('/notes/series');
  await expect(page.getByRole('heading', { name: 'Note series' })).toBeVisible();
  await page.getByRole('link', { name: /Building Kotree/ }).click();

  await expect(page.getByRole('heading', { name: 'Building Kotree' })).toBeVisible();
  const parts = page.locator('ol a');
  await expect(parts.first()).toContainText('Part 1');
  await parts.first().click();

  await expect(page.getByText('Part 1 of 7 in')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Building Kotree' })).toBeVisible();
});
