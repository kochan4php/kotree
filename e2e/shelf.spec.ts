import { test, expect, type Page } from '@playwright/test';

// G2: the reading shelf. Saved pages, reading progress and highlights live in
// the browser; the shelf server-renders an empty state and fills from IndexedDB.

const NOTE = '/notes/2026-10-12-offline-first';
const TITLE = 'Offline, on purpose';

// Same gate the other suites use: wait for hydration and the service worker
// before trusting a click or a typed value.
async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle');
  let swConfirmed = true;
  await page
    .waitForFunction(
      () => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)),
      null,
      { timeout: 10000 }
    )
    .catch(() => {
      swConfirmed = false;
    });
  await page.waitForTimeout(swConfirmed ? 300 : 2500);
}

test('a note can be saved, read to the end and removed from the shelf', async ({ page }) => {
  await page.goto(NOTE);
  await waitHydrated(page);

  const save = page.getByRole('button', { name: 'Save to your shelf' });
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(save).toContainText('Saved');

  // Read to the bottom so the progress recorder marks it finished
  await page.mouse.wheel(0, 100000);
  await page.waitForFunction(() => window.scrollY > 100);
  await page.waitForTimeout(600);

  await page.goto('/shelf');
  await expect(page.getByRole('heading', { level: 1, name: 'Shelf' })).toBeVisible();
  // Saved and Read both list it — the shelf keeps one record per page
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible();
  await expect(page.getByRole('link', { name: TITLE }).first()).toBeVisible();

  await page.getByRole('button', { name: `Remove ${TITLE} from your shelf` }).click();
  await expect(page.getByRole('heading', { name: 'Saved' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: TITLE })).toHaveCount(1);
});

test('selecting text highlights it, and the shelf can take it back', async ({ page }) => {
  await page.goto(NOTE);
  await waitHydrated(page);

  const quote = await page.evaluate(() => {
    const paragraph = document.querySelector('main .e-content p');
    const node = paragraph && document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode();
    if (!node) return null;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(40, node.textContent?.length ?? 0));
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // A reader finishing a selection with the pointer
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return selection?.toString() ?? null;
  });
  expect(quote).toBeTruthy();

  await page.getByRole('button', { name: 'Highlight the selected text' }).click();
  await expect(page.locator('mark.kt-highlight')).toHaveCount(1);

  // It is put back on the next visit…
  await page.reload();
  await expect(page.locator('mark.kt-highlight')).toHaveCount(1);

  // …and listed, then removable, on the shelf
  await page.goto('/shelf');
  await expect(page.locator('blockquote').first()).toContainText(quote!.trim());
  await page.getByRole('button', { name: 'Remove this highlight from ' + TITLE }).click();
  await page.goto(NOTE);
  await expect(page.locator('mark.kt-highlight')).toHaveCount(0);
});

test('an unfinished note is offered on the home page', async ({ page }) => {
  // A short viewport guarantees the note is longer than the screen
  await page.setViewportSize({ width: 390, height: 420 });
  await page.goto(NOTE);
  await waitHydrated(page);
  await page.waitForTimeout(400);

  await page.goto('/');
  await expect(page.getByText('Continue reading')).toBeVisible();
  await expect(page.getByRole('link', { name: TITLE })).toBeVisible();
  await page.getByRole('link', { name: 'your shelf' }).click();
  await expect(page).toHaveURL('/shelf');
});
