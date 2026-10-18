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

// M1b: per-route weight — the raw JS the route pulls in before its load event.
// Measured on 2026-10-19: home 696 kB, the other four 629-662 kB. These byte
// counts come from the build, not the machine, so this budget deliberately has
// no CI multiplier. Raise it only when a route genuinely needs to carry more.
const JS_BUDGET = 800 * 1024;

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

    // Everything the route needed to paint, counted up to the load event so a
    // lazily loaded chunk arriving later cannot make this flaky.
    const jsBytes = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const cutoff = nav.loadEventEnd || nav.domContentLoadedEventEnd;
      return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter(
          (entry) => entry.startTime <= cutoff && /\.js(\?|$)/.test(new URL(entry.name).pathname)
        )
        .reduce((sum, entry) => sum + entry.decodedBodySize, 0);
    });
    expect(jsBytes, `route JS ${(jsBytes / 1024).toFixed(0)} kB`).toBeLessThan(JS_BUDGET);
  });
}
