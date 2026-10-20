import { test, expect } from '@playwright/test';

// WCAG 2.2 SC 2.5.8: pointer targets are at least 24 by 24 CSS pixels, except
// links inline in a sentence. This checks the page rather than every dialog;
// the interactive-states axe pass covers those. Pages use content-visibility,
// so scan while scrolling instead of once from the top.
const PAGES = [
  '/',
  '/notes',
  '/notes/2026-10-12-offline-first',
  '/notes/tags/pwa',
  '/projects',
  '/projects/kotree',
  '/guestbook',
  '/stats',
  '/about',
  '/changelog',
  '/search',
  '/uses',
  '/shelf',
  '/wrapped',
  '/qr',
  '/definitely-not-a-page',
];

for (const path of PAGES) {
  test(`WCAG 2.2 target size: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    await page.waitForTimeout(300);

    const small = await page.evaluate(async () => {
      const bad = new Map<HTMLElement, string>();

      const scan = () => {
        const nodes = document.querySelectorAll<HTMLElement>(
          'a[href], button, [role="button"], summary, input, select, textarea'
        );
        for (const el of nodes) {
          if (el.closest('[aria-hidden="true"], [hidden]')) continue;
          if (el.classList.contains('sr-only')) continue;
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
          if (el.getClientRects().length === 0) continue;
          if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') continue;
          if (el.tagName === 'A' && style.display === 'inline') continue;
          if (el.tagName === 'INPUT' && ['radio', 'checkbox'].includes((el as HTMLInputElement).type)) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width >= 24 && rect.height >= 24) continue;

          const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 40);
          bad.set(
            el,
            `${Math.round(rect.width)}x${Math.round(rect.height)} <${el.tagName.toLowerCase()}> "${name}"`
          );
        }
      };

      scan();
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
        scan();
      }
      window.scrollTo(0, 0);
      return [...bad.values()];
    });

    expect(small, `Pointer targets below 24x24:\n${small.join('\n')}`).toEqual([]);
  });
}
