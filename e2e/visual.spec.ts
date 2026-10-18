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

async function freeze(page: Page, path: string, theme: 'light' | 'dark' = 'light') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((selected) => {
    localStorage.setItem(
      'kotree-prefs',
      JSON.stringify({ theme: selected, accent: 'orange', fx: false, sound: false })
    );
  }, theme);
  await page.route('**/api/guestbook?*', (route) => route.fulfill({ json: [] }));
  // M44: the guestbook renders the poll card — pin its data so the baseline
  // never depends on whatever question is live in the local database
  await page.route('**/api/poll', (route) =>
    route.fulfill({
      json: {
        active: {
          id: 'poll-visual',
          question: 'Which secret do you reveal first?',
          options: [
            { label: 'Newest', count: 2 },
            { label: 'Top hearts', count: 5 },
          ],
          total: 7,
        },
        archive: [],
      },
    })
  );
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

// K38/K48: dark scheme at two widths, plus the guestbook and a note detail
const EXTRA_PAGES = [
  { name: 'home-dark', path: '/', theme: 'dark' as const, widths: [1100, 1440] },
  { name: 'guestbook', path: '/guestbook', theme: 'light' as const, widths: [1440] },
  { name: 'note-detail', path: '/notes/2026-10-12-offline-first', theme: 'light' as const, widths: [1440] },
];

for (const { name, path, theme, widths } of EXTRA_PAGES) {
  for (const width of widths) {
    test(`visual: ${name} at ${width}x900`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await freeze(page, path, theme);
      await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
    });
  }
}
