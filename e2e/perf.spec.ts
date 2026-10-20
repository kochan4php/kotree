import { test, expect } from '@playwright/test';

// M1: performance budget guard — no Lighthouse needed. Each test gets a cold
// context (empty cache, no service worker) on the production build, with a 4x
// CPU slowdown. Budgets are doubled in CI where runners are shared and slower.
declare global {
  interface Window {
    __perf?: { lcp: number; cls: number };
    __eventDurations?: number[];
  }
}

const MULT = process.env.CI ? 2 : 1;

// M1b: per-route weight — the raw JS the route pulls in before its load event.
// Measured on 2026-10-20 after dropping ethers and sonner: home 670 kB, the
// other five 599-634 kB. These byte counts come from the build, not the
// machine, so this budget deliberately has no CI multiplier. Raise it only
// when a route genuinely needs to carry more.
const JS_BUDGET = 700 * 1024;

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'about' },
  { path: '/accessibility', name: 'accessibility' },
  { path: '/changelog', name: 'changelog' },
  { path: '/explore', name: 'explore' },
  { path: '/guestbook', name: 'guestbook' },
  { path: '/links', name: 'links' },
  { path: '/notes', name: 'notes' },
  { path: '/notes/2026-10-12-offline-first', name: 'note' },
  { path: '/notes/tags', name: 'note tags' },
  { path: '/notes/tags/pwa', name: 'note tag' },
  { path: '/now', name: 'now' },
  { path: '/offline', name: 'offline' },
  { path: '/privacy', name: 'privacy' },
  { path: '/projects', name: 'projects' },
  { path: '/projects/kotree', name: 'project' },
  { path: '/projects/tags', name: 'project tags' },
  { path: '/projects/tags/next.js', name: 'project tag' },
  { path: '/qr', name: 'qr' },
  { path: '/search', name: 'search' },
  { path: '/secrets', name: 'secrets' },
  { path: '/shelf', name: 'shelf' },
  { path: '/stats', name: 'stats' },
  { path: '/status', name: 'status' },
  { path: '/uses', name: 'uses' },
  { path: '/wrapped', name: 'wrapped' },
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

// INP proxy: real interaction latency after hydration, measured at 4x CPU.
// Event Timing only reports events over 16ms, which is exactly the noise floor
// this budget cares about.
test('interaction budget: theme and palette', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    const durations: number[] = [];
    window.__eventDurations = durations;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        durations.push(entry.duration);
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit & {
      durationThreshold: number;
    });
  });
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('offline');
  await page.keyboard.press('Escape');

  const max = await page.evaluate(() =>
    Math.max(0, ...(window.__eventDurations ?? []))
  );
  expect(max, `slowest interaction ${max.toFixed(0)}ms`).toBeLessThan(200 * MULT);
});
