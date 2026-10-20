import { test, expect } from '@playwright/test';

// WCAG 2.2 SC 1.4.10: no two-dimensional scrolling at 320 CSS pixels. Code
// blocks and tables may scroll inside their own box; the document may not.
const PAGES = [
  '/',
  '/notes',
  '/notes/2026-10-12-offline-first',
  '/projects/kotree',
  '/guestbook',
  '/stats',
  '/changelog',
  '/search',
  '/wrapped',
  '/definitely-not-a-page',
];

for (const path of PAGES) {
  test(`reflow at 320px: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path, { waitUntil: 'load' });
    await page.waitForTimeout(300);

    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));

    expect(Math.max(widths.document, widths.body), `page scrolls sideways at ${widths.viewport}px`).toBeLessThanOrEqual(
      widths.viewport + 1
    );
  });
}
