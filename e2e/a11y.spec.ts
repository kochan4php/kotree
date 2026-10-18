import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Every page must pass axe with zero serious/critical violations.
// Moderate/minor findings are allowed but printed for visibility.
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'changelog', path: '/changelog' },
  { name: 'admin', path: '/admin' },
  { name: 'status', path: '/status' },
  { name: 'note', path: '/notes/2026-10-12-offline-first' },
  { name: 'tags', path: '/projects/tags' },
  { name: 'tag', path: '/projects/tags/pwa' },
  { name: 'stats', path: '/stats' },
  { name: 'wrapped', path: '/wrapped' },
  { name: 'not-found', path: '/this-page-does-not-exist' },
  // K38: the newer pages join the audit in both schemes
  { name: 'notes', path: '/notes' },
  { name: 'projects', path: '/projects' },
  { name: 'project', path: '/projects/kotree' },
  { name: 'guestbook', path: '/guestbook' },
  { name: 'about', path: '/about' },
  { name: 'now', path: '/now' },
  { name: 'secrets', path: '/secrets' },
  // K59: the privacy note is a page like any other
  { name: 'privacy', path: '/privacy' },
  // M18: the accessibility statement joins every audit
  { name: 'accessibility', path: '/accessibility' },
  // M34/M32: the new reference pages and the share-card gallery
  { name: 'uses', path: '/uses' },
  { name: 'links', path: '/links' },
  { name: 'og-gallery', path: '/og' },
  // M51/M56: the map and the QR code page
  { name: 'explore', path: '/explore' },
  { name: 'qr', path: '/qr' },
];

for (const { name, path } of PAGES) {
  // K44/K45: the home audit doubles as the cross-browser and mobile a11y check
  const tag = name === 'home' ? ' @crossbrowser @mobile' : '';
  test(`a11y: ${name} has no serious or critical violations${tag}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
    ).toEqual([]);
  });
}

// R32: dark mode + reduced motion across three viewports. Colour-scheme
// emulation flips the auto theme; reduced motion also disables the looping
// effects, so this covers both preference paths.
test.describe('dark + reduced motion', () => {
  test.use({ colorScheme: 'dark' });

  for (const width of [390, 1100, 1920]) {
    for (const { name, path } of PAGES) {
      test(`a11y: ${name} at ${width}px (dark, reduced motion)`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);

        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical'
        );

        expect(
          blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
        ).toEqual([]);
      });
    }
  }
});

// K37: WCAG 1.4.10 reflow — at a 320px viewport (= 1280px at 400% zoom) and a
// 640px viewport (= 1280px at 200% zoom) no page may scroll sideways.
test.describe('reflow', () => {
  for (const width of [320, 640]) {
    for (const { name, path } of PAGES) {
      test(`reflow: ${name} has no horizontal scroll at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }
  }
});

// K36: Windows High Contrast. Structure must survive when fills flatten: cards
// keep their border, focus stays visible, and nothing scrolls sideways.
test.describe('forced colors', () => {
  test.use({ colorScheme: 'dark' });

  for (const { name, path } of [
    { name: 'home', path: '/' },
    { name: 'guestbook', path: '/guestbook' },
    { name: 'stats', path: '/stats' },
  ]) {
    test(`forced colors: ${name} stays usable`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Cards keep a real border (shadows are gone in this mode)
      const borderWidth = await page
        .locator('.fluid-glass')
        .first()
        .evaluate((el) => getComputedStyle(el).borderTopWidth);
      expect(parseFloat(borderWidth)).toBeGreaterThanOrEqual(2);

      // Keyboard focus is still visible
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? getComputedStyle(el).outlineStyle : 'none';
      });
      expect(outline).not.toBe('none');

      // And no horizontal scroll appears
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});

// M11: WCAG 2.2 target size (2.5.8) — every control is at least 24×24 CSS px.
// Inline links inside running text are exempt by the spec, so `display: inline`
// elements are skipped.
test.describe('target size', () => {
  for (const { name, path } of [
    { name: 'home', path: '/' },
    { name: 'guestbook', path: '/guestbook' },
    { name: 'notes', path: '/notes' },
    { name: 'status', path: '/status' },
    { name: 'secrets', path: '/secrets' },
    { name: 'changelog', path: '/changelog' },
    { name: 'about', path: '/about' },
  ]) {
    test(`target size: ${name}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const small = await page.evaluate(() => {
        const out: { tag: string; label: string; w: number; h: number }[] = [];
        const candidates = document.querySelectorAll<HTMLElement>(
          'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea'
        );
        for (const el of candidates) {
          const style = getComputedStyle(el);
          if (style.display === 'inline' || style.visibility === 'hidden' || style.display === 'none') continue;
          const rect = el.getBoundingClientRect();
          // Screen-reader-only pattern (1×1 clipped, e.g. the skip link before
          // focus): not a presented target, exempt.
          if (rect.width <= 2 && rect.height <= 2) continue;
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.width < 24 || rect.height < 24) {
            out.push({
              tag: el.tagName.toLowerCase(),
              label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
            });
          }
        }
        return out;
      });
      expect(small).toEqual([]);
    });
  }
});

// M13: WCAG 1.4.12 text spacing — the layout must survive doubled spacing.
test.describe('text spacing', () => {
  for (const { name, path } of [
    { name: 'home', path: '/' },
    { name: 'guestbook', path: '/guestbook' },
    { name: 'notes', path: '/notes' },
    { name: 'note', path: '/notes/2026-10-12-offline-first' },
  ]) {
    test(`text spacing: ${name} stays usable with expanded text`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.addStyleTag({
        content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
                  p, li, dd { margin-bottom: 2em !important; }`,
      });
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    });
  }
});

// M14: axe with the interactive states open — palette, prefs, terminal, QR and
// the Win95 shell each get their own audit pass.
test.describe('interactive states', () => {
  const STATES: { name: string; open: (page: import('@playwright/test').Page) => Promise<void> }[] = [
    {
      name: 'command palette',
      open: async (page) => {
        await page.keyboard.press('Control+k');
        await expect(page.getByRole('dialog').first()).toBeVisible();
      },
    },
    {
      name: 'preferences panel',
      open: async (page) => {
        await page.evaluate(() => window.dispatchEvent(new Event('kotree:prefs-open')));
        await expect(page.getByRole('dialog').first()).toBeVisible();
      },
    },
    {
      name: 'terminal',
      open: async (page) => {
        await page.evaluate(() => window.dispatchEvent(new Event('kotree:terminal')));
        await expect(page.getByRole('dialog').first()).toBeVisible();
      },
    },
    {
      name: 'QR dialog',
      open: async (page) => {
        await page.evaluate(() => window.dispatchEvent(new Event('kotree:qr')));
        await expect(page.getByRole('dialog', { name: 'QR Code' })).toBeVisible();
      },
    },
    {
      name: 'Win95 shell',
      open: async (page) => {
        await page.evaluate(() => window.dispatchEvent(new Event('ACTIVATE_WIN95')));
        await expect(page.getByRole('button', { name: 'Exit Win95' })).toBeVisible();
      },
    },
  ];

  for (const state of STATES) {
    test(`axe: ${state.name} has no serious or critical violations`, async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await state.open(page);
      await page.waitForTimeout(300);

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      expect(
        blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
      ).toEqual([]);
    });
  }
});

// M15: a journey that only uses the keyboard — skip link, palette navigation,
// and typing a secret on the wall.
test('keyboard journey: skip link, palette, guestbook post', async ({ page }) => {
  // The journey proves keyboard operability, not the API — serve a small fixed
  // wall and answer the POST locally so the tab order is deterministic and the
  // run never depends on the wall's rate limit or Mongo.
  const FIXTURES = Array.from({ length: 6 }, (_, i) => ({
    id: `fixture-${i}`,
    message: `🤫 fixture-secret-${i}`,
    createdAt: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
    reactions: {},
  }));
  await page.route('**/api/guestbook**', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: FIXTURES });
    if (route.request().method() === 'POST') return route.fulfill({ status: 200, body: '{}' });
    return route.continue();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await page.keyboard.type('guestbook');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/guestbook$/);

  const input = page.getByLabel('Secret message');
  // Budget covers the whole page (filters, tabs and every entry's reaction row)
  for (let i = 0; i < 200; i++) {
    if (await input.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(input).toBeFocused();
  await page.keyboard.type('sent with the keyboard only');

  const send = page.getByLabel('Send message');
  for (let i = 0; i < 8; i++) {
    if (await send.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(send).toBeFocused();
  const before = await page.locator('[id^="secret-"]').count();
  await page.keyboard.press('Enter');
  // Optimistic UI: the wall gains the entry and the box empties.
  await expect(page.locator('[id^="secret-"]')).toHaveCount(before + 1);
  await expect(input).toHaveValue('');
});

// M17: landmarks and heading order — one h1, exactly one main landmark, and no
// skipped heading levels on any page.
test.describe('landmarks and headings', () => {
  for (const { name, path } of PAGES) {
    test(`landmarks: ${name} has one h1, one main, ordered headings`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const report = await page.evaluate(() => {
        const visible = (el: Element) => el.getClientRects().length > 0;
        const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
          .filter(visible)
          .map((h) => Number(h.tagName[1]));
        let skip = false;
        let prev = 0;
        for (const level of headings) {
          if (prev !== 0 && level > prev + 1) skip = true;
          prev = level;
        }
        return {
          h1: headings.filter((level) => level === 1).length,
          skip,
          main: [...document.querySelectorAll('main,[role="main"]')].filter(visible).length,
        };
      });
      expect(report.h1).toBe(1);
      expect(report.main).toBe(1);
      expect(report.skip, `heading order: ${JSON.stringify(report)}`).toBe(false);
    });
  }
});

// M21: the heavy interactive states must survive 400% zoom (a 320px viewport)
// without sideways scrolling either.
test('reflow @320: palette, terminal and Win95 keep one column', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog').first()).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog').first()).toBeHidden();

  await page.evaluate(() => window.dispatchEvent(new Event('kotree:terminal')));
  await expect(page.getByRole('dialog').first()).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(1);
  await page.getByLabel('Close terminal').click();
  await expect(page.getByRole('dialog').first()).toBeHidden();

  await page.evaluate(() => window.dispatchEvent(new Event('ACTIVATE_WIN95')));
  const exit = page.getByRole('button', { name: 'Exit Win95' });
  await expect(exit).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(1);
  await exit.click();
});

// M20: with reduced motion — the OS setting or the in-app switch — nothing
// keeps animating.
test.describe('reduced motion', () => {
  const stillAnimating = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);

  test('OS setting: no animation keeps running', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of ['/', '/stats', '/wrapped']) {
      await page.goto(path);
      await page.waitForTimeout(600);
      expect(await stillAnimating(page), `${path} still animates`).toBe(0);
    }
  });

  test('the in-app switch reduces motion on its own', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kotree-prefs', JSON.stringify({ reduceMotion: true }));
    });
    for (const path of ['/', '/stats']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
      await page.waitForTimeout(600);
      expect(await stillAnimating(page), `${path} still animates`).toBe(0);
    }
  });
});
