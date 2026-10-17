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
];

for (const { name, path } of PAGES) {
  test(`a11y: ${name} has no serious or critical violations`, async ({ page }) => {
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
