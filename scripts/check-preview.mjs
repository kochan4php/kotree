import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// P12: the preview deployment gets the same accessibility bar as local e2e,
// plus a coarse field-style paint/layout check. It is deliberately slower and
// looser than the lab perf budget: a preview is served over the public
// internet and is not the machine the budget was calibrated on.
const base = (process.argv[2] || process.env.SMOKE_URL || '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node scripts/check-preview.mjs https://preview.example');
  process.exit(2);
}

const routes = ['/', '/notes', '/projects', '/guestbook', '/search?q=offline', '/about'];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
let failures = 0;

try {
  for (const route of routes) {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 45_000 });
    if (!response || response.status() >= 400) {
      console.error(`FAIL ${route}: HTTP ${response?.status() ?? 'no response'}`);
      failures += 1;
      continue;
    }

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const bad = axe.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    if (bad.length > 0) {
      failures += 1;
      console.error(`FAIL ${route}: ${bad.map((v) => `${v.id} (${v.nodes.length})`).join(', ')}`);
    } else {
      console.log(`ok   ${route} — axe`);
    }

    const paint = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let lcp = 0;
          let cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) cls += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve({ lcp, cls }), 1200);
        }),
    );
    if (paint.lcp > 4_000 || paint.cls > 0.15) {
      failures += 1;
      console.error(`FAIL ${route}: LCP ${Math.round(paint.lcp)}ms, CLS ${paint.cls.toFixed(3)}`);
    } else {
      console.log(`ok   ${route} — LCP ${Math.round(paint.lcp)}ms, CLS ${paint.cls.toFixed(3)}`);
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'Preview checks passed.' : `${failures} preview check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
