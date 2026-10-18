import { test, expect, type Page } from '@playwright/test';

// Layout invariants: the checks a screenshot cannot make. A baseline records
// whatever the layout happened to be — these measure whether it is right.
// Each one covers something that shipped: the dock spilling past its border,
// the left rail ending in a bare patch on wide screens, and the link cards
// staying one-per-row on a tablet where two clearly fit.

const WIDTHS = [320, 390, 640, 768, 834, 1024, 1112, 1280, 1440, 1920];

// The link grid goes two-up from 33rem of column (see utilities.css). Read the
// threshold in the page's own rem, because the root font size is not 16px.
const TWO_UP_REM = 33;

async function settle(page: Page) {
  // Let the entry animations finish before measuring: the cards rise into
  // place on a per-card delay, and mid-flight positions read as extra rows
  // that are not really there. Looping animations (the status pulse) never
  // finish, so they are excluded rather than waited on.
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
    undefined,
    { timeout: 10_000 },
  );
  // Then one quiet beat for fetched content (the guestbook list) to land.
  await page.waitForTimeout(400);
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element) => el.getBoundingClientRect();
    const aside = document.querySelector('aside') as HTMLElement;
    const railLast = aside.lastElementChild as HTMLElement;
    const grid = document.querySelector('.link-grid') as HTMLElement;
    const column = grid.parentElement as HTMLElement;
    const cards = [...grid.children] as HTMLElement[];
    const guestbook = [...document.querySelectorAll('[data-slot="card"]')].find((c) =>
      /Secret Confessions/.test(c.textContent ?? ''),
    ) as HTMLElement | undefined;
    const list = guestbook?.querySelector('.overflow-y-auto') as HTMLElement | null;
    return {
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      railHole: Math.round(box(aside).bottom - box(railLast).bottom),
      columnWidth: Math.round(box(column).width),
      gridWidth: Math.round(box(grid).width),
      cards: cards.length,
      // offsetTop, not the rect: a transform mid-animation must not invent rows
      rows: new Set(cards.map((c) => c.offsetTop)).size,
      lastCardWidth: Math.round(box(cards[cards.length - 1]).width),
      asideBottom: Math.round(box(aside).bottom),
      guestbookTop: guestbook ? Math.round(box(guestbook).top) : -1,
      listHeight: list ? Math.round(list.clientHeight) : -1,
    };
  });
}

for (const width of WIDTHS) {
  test(`layout holds at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    // The fixed settle is deliberate: networkidle can wait on the link-count
    // refresh, and none of these invariants depends on fetched data.
    await page.waitForTimeout(600);
    const m = await measure(page);
    const rem = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    const twoUpFrom = rem * TWO_UP_REM;

    // 1. Nothing may spill sideways — the dock and the share buttons used to.
    expect(m.horizontalOverflow, 'horizontal overflow').toBeLessThanOrEqual(1);

    // 2. The rail ends level with whatever sits beside it: no bare patch at
    //    the foot of the left column.
    expect(m.railHole, 'bare patch under the rail').toBeLessThanOrEqual(2);

    // 3. The link cards pair up exactly when their own column is wide enough,
    //    whatever the viewport or rail width happens to be.
    const twoUp = m.columnWidth >= twoUpFrom;
    expect(m.rows, `rows for ${m.cards} cards in a ${m.columnWidth}px column`).toBe(
      twoUp ? Math.ceil(m.cards / 2) : m.cards,
    );

    // 4. With an odd number of cards the trailing one spans the whole row.
    if (twoUp && m.cards % 2 === 1) {
      expect(m.lastCardWidth, 'trailing card spans the row').toBeGreaterThan(m.gridWidth * 0.9);
    }

    // 5. Once there is room the guestbook sits beside the rail, not under it,
    //    and its message list stays tall enough to read more than two secrets.
    if (twoUp) expect(m.guestbookTop, 'guestbook sits beside the rail').toBeLessThan(m.asideBottom);
    if (m.listHeight > 0) expect(m.listHeight, 'guestbook list height').toBeGreaterThanOrEqual(240);
  });
}
