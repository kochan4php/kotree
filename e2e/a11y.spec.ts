import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Every page must pass axe with zero serious/critical violations.
// Moderate/minor findings are allowed but printed for visibility.
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'changelog', path: '/changelog' },
  { name: 'admin', path: '/admin' },
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
