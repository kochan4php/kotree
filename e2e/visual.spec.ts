import { test, expect, type Page } from '@playwright/test';

// R1: pixel regression for home, changelog and the 404 page at five widths.
// Deterministic by construction: preferences frozen (light, no effects), the
// timezone and clock fixed, APIs stubbed, animations disabled, content-visibility forced
// visible so below-the-fold blocks always render into the capture.
//
// Baselines are win32-only — font rasterisation differs per OS, so other
// platforms skip rather than report false diffs.
test.skip(process.platform !== 'win32', 'visual baselines were captured on win32');
test.use({ timezoneId: 'Asia/Bangkok' });

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

async function freeze(
  page: Page,
  path: string,
  extraPrefs: Record<string, unknown> = {}
) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((extra) => {
    localStorage.setItem(
      'kotree-prefs',
      JSON.stringify({ accent: 'orange', fx: false, sound: false, ...extra })
    );
  }, extraPrefs);
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
  // G1: reaction counts come from a live counter — pin them so the baseline
  // never depends on how many people pressed the buttons in the dev database
  await page.route('**/api/reactions?*', (route) => route.fulfill({ json: {} }));
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

// The guestbook and a note detail join the base pages. /stats and /wrapped are
// not here because their live counters would encode one afternoon of numbers.
const EXTRA_PAGES = [
  { name: 'guestbook', path: '/guestbook', widths: [1440] },
  { name: 'note-detail', path: '/notes/2026-10-12-offline-first', widths: [1440] },
];

for (const { name, path, widths } of EXTRA_PAGES) {
  for (const width of widths) {
    test(`visual: ${name} at ${width}x900`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await freeze(page, path);
      await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
    });
  }
}

// M82: the two sizes the audit wanted eyes on — a 2560px ultrawide and a
// phone held sideways. Both must read like the same site, not a stretched one.
test('visual: home ultrawide at 2560x1440', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await freeze(page, '/');
  await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
});

test('visual: home landscape at 844x390', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await freeze(page, '/');
  await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
});

// M74: live UI states — the overlays and modes the page baselines never
// reach: palette, QR modal, terminal, the Win95 desktop, forced colors and
// the in-app reduced-motion rendering.

test('visual: palette with results at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freeze(page, '/');
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('wrapped 2025');
  const palette = page.getByRole('dialog', { name: 'Search and commands' });
  await expect(palette.getByText('Open Kotree Wrapped 2025')).toBeVisible();
  await expect(palette).toHaveScreenshot({ animations: 'disabled' });
});

test('visual: QR modal at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freeze(page, '/');
  await page.getByRole('button', { name: 'Show QR Code' }).click();
  const dialog = page.getByRole('dialog', { name: 'QR Code' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveScreenshot({ animations: 'disabled' });
});

test('visual: AI terminal at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freeze(page, '/');
  await page.getByRole('button', { name: 'Open AI Terminal' }).click();
  const terminal = page.getByRole('dialog', { name: 'AI Terminal' });
  await expect(terminal).toBeVisible();
  await expect(terminal).toHaveScreenshot({ animations: 'disabled' });
});

test('visual: Win95 desktop with Notepad at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freeze(page, '/');
  // The window manager places every window at Math.random()×50 — seed it so
  // two runs agree on where Notepad landed.
  await page.evaluate(() => {
    let state = 20261018;
    Math.random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95')));
  await expect(page.getByRole('button', { name: 'Minesweeper' })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(450); // the desktop slides in — let it settle (same as freeze)
  // Icons open on double-click or Enter; Enter sidesteps overlapping windows
  const icon = page.getByRole('button', { name: 'Notepad' });
  await icon.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Notepad draft' })).toBeVisible();
  await page.waitForTimeout(450); // ...and so does the window itself
  await expect(page).toHaveScreenshot({ animations: 'disabled' });
});

test('visual: forced colors at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freeze(page, '/');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.waitForTimeout(200);
  await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
});

test('visual: reduced motion keeps home calm at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freeze(page, '/', { reduceMotion: true });
  await expect(page).toHaveScreenshot({ fullPage: true, animations: 'disabled' });
});
