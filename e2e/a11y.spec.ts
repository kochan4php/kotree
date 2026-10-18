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
