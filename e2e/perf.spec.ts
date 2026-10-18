import { test, expect } from '@playwright/test';

// M1: performance budget guard — no Lighthouse needed. Each test gets a cold
// context (empty cache, no service worker) on the production build, with a 4x
// CPU slowdown. Budgets are doubled in CI where runners are shared and slower.
declare global {
  interface Window {
    __perf?: { lcp: number; cls: number };
  }
}

const MULT = process.env.CI ? 2 : 1;

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/notes', name: 'notes' },
  { path: '/projects', name: 'projects' },
  { path: '/guestbook', name: 'guestbook' },
  { path: '/stats', name: 'stats' },
];

for (const { path, name } of PAGES) {
  test(`perf budget: ${name}`, async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.addInitScript(() => {
      window.__perf = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__perf!.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) window.__perf!.cls += shift.value ?? 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto(path, { waitUntil: 'load' });
    // Let late layout shifts land (fonts, streamed sections) before reading.
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return { lcp: window.__perf?.lcp ?? 0, cls: window.__perf?.cls ?? 0, ttfb: nav.responseStart };
    });

    expect(m.ttfb, `TTFB ${m.ttfb.toFixed(0)}ms`).toBeLessThan(800 * MULT);
    expect(m.lcp, `LCP ${m.lcp.toFixed(0)}ms`).toBeLessThan(2500 * MULT);
    expect(m.cls, `CLS ${m.cls.toFixed(3)}`).toBeLessThan(0.1);
  });
}
