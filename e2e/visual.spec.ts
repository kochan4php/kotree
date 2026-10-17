import { test, expect, type Page } from '@playwright/test';

// R1: pixel regression for home, changelog and the 404 page at five widths.
// Deterministic by construction: preferences frozen (light, no effects), the
// clock fixed, APIs stubbed, animations disabled, content-visibility forced
// visible so below-the-fold blocks always render into the capture.
//
// Baselines are win32-only — font rasterisation differs per OS, so other
// platforms skip rather than report false diffs.
test.skip(process.platform !== 'win32', 'visual baselines were captured on win32');

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 834, height: 1112 },
  { width: 1100, height: 900 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'changelog', path: '/changelog' },
  { name: 'not-found', path: '/this-page-does-not-exist' },
];

async function freeze(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem(
      'kotree-prefs',
      JSON.stringify({ theme: 'light', accent: 'orange', fx: false, sound: false })
    );
  });
  await page.route('**/api/guestbook?*', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/click-link-counter*', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] });
    return route.continue();
  });
  await page.clock.setFixedTime(new Date('2026-06-15T10:30:00Z'));
  await page.goto(path, { waitUntil: 'networkidle' });
  // cv-auto blocks are skipped in full-page captures otherwise
  await page.addStyleTag({ content: '* { content-visibility: visible !important; }' });
  await page.waitForTimeout(400);
}

for (const { name, path } of PAGES) {
  for (const viewport of VIEWPORTS) {
    test(`visual: ${name} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await freeze(page, path);
      await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
    });
  }
}
