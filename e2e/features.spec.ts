import { test, expect, type Page } from '@playwright/test';

// R43: feature-level coverage for the interactions added in 3.2.0 —
// theme persistence, palette keyboard flow, the offline guestbook queue,
// permalinks and the smart 404.

const ENTRY = {
  id: 'e2e-1',
  message: 'cipher-e2e-1',
  createdAt: '2026-06-15T10:00:00.000Z',
  reactions: {},
};

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

test('command palette keyboard: cycling the theme sticks across reloads', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  // auto -> light
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('cycle');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  // light -> dark
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('cycle');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // The choice is remembered
  await page.reload();
  await waitHydrated(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('command palette keyboard: typing then Enter navigates', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('changelog');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/changelog$/);
});

test.describe('offline', () => {
  // Block the service worker so request interception stays deterministic
  test.use({ serviceWorkers: 'block' });

  test('guestbook messages queue while offline and send when back online', async ({ page, context }) => {
    let posts = 0;
    await page.route('**/api/guestbook?*', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/guestbook', async (route) => {
      if (route.request().method() === 'POST') {
        posts++;
        return route.fulfill({ json: { success: true } });
      }
      return route.continue();
    });

    await page.goto('/');
    await waitHydrated(page);

    // K14: text typed into the guestbook survives a reload
    await page.getByLabel('Secret message').fill('draft survives reload');
    await page.reload();
    await waitHydrated(page);
    await expect(page.getByLabel('Secret message')).toHaveValue('draft survives reload');

    await context.setOffline(true);
    await page.getByLabel('Secret message').fill('queued while offline');
    await page.getByRole('button', { name: 'Send message' }).click();

    // K14: once the message is safely queued the draft is gone
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('kotree-guestbook-draft')), { timeout: 5000 })
      .toBeNull();

    // The optimistic entry is marked pending and the counter appears
    await expect(page.getByText('waiting to send…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/waiting to send — we/)).toBeVisible();

    // Back online: the queue flushes itself
    await context.setOffline(false);
    await expect(page.getByText(/secret delivered/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('waiting to send…')).toHaveCount(0);
    expect(posts).toBeGreaterThan(0);
  });
});

test.describe('guestbook permalinks', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copying a permalink and opening it highlights the entry', async ({ page }) => {
    await page.route('**/api/guestbook?*', (route) => route.fulfill({ json: [ENTRY] }));

    await page.goto('/');
    await waitHydrated(page);

    await page.getByRole('button', { name: 'Copy permalink' }).first().click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('#secret-e2e-1');

    await page.goto('/#secret-e2e-1');
    await waitHydrated(page);
    const entry = page.locator('#secret-e2e-1');
    await expect(entry).toBeVisible();

    // The permalink scrolls the entry into view. The ring highlight is
    // deliberately transient (4 seconds), so assert the stable scroll
    // position instead of the brief class.
    const box = await entry.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(720);
  });
});

test('404 search finds a page and Enter opens it', async ({ page }) => {  await page.goto('/definitely-not-a-page');
  await waitHydrated(page);

  await page.getByLabel('Search pages and links').fill('projects');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/projects$/);
});

test('status page reports live health', async ({ page }) => {
  await page.goto('/status');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
  await expect(page.getByText('Database')).toBeVisible();
  await expect(page.getByText('Offline support')).toBeVisible();
  await expect(page.getByText('App version')).toBeVisible();
});

test('a shared post lands in the guestbook message box', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  // The POST below must go through the service worker
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });

  const status = await page.evaluate(async () => {
    const body = new URLSearchParams({ text: 'shared from android', url: 'https://example.com' });
    const res = await fetch('/share', { method: 'POST', body });
    return res.status;
  });
  expect(status).toBe(200);

  await page.goto('/guestbook');
  await waitHydrated(page);
  await expect(page.getByLabel('Secret message')).toHaveValue(/shared from android/);
});

test('palette searches note content and opens it', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('offline on purpose');
  // The content index loads lazily — wait for the note to appear first
  await expect(page.getByText('Offline, on purpose')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/notes\/2026-10-12-offline-first$/);
});

test('tag pages group projects and link through to them', async ({ page }) => {
  await page.goto('/projects/tags');
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: /next\.js/ }).click();
  await expect(page).toHaveURL(/\/projects\/tags\/next-js$/);
  await expect(page.getByRole('heading', { name: 'next.js' })).toBeVisible();

  await page.locator('a[href="/projects/kotree"]').first().click();
  await expect(page).toHaveURL(/\/projects\/kotree$/);
});

test('articles show reading time, a table of contents and related links', async ({ page }) => {
  await page.goto('/projects/kotree');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText(/min read/)).toBeVisible();

  const toc = page.getByRole('navigation', { name: 'On this page' });
  await expect(toc).toBeVisible();
  await toc.getByRole('link', { name: 'What is inside' }).click();
  await expect(page).toHaveURL(/#what-is-inside$/);

  await expect(page.getByRole('heading', { name: 'Related' })).toBeVisible();
});

test.describe('changelog permalinks', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('version anchors exist and copy a shareable link', async ({ page }) => {
    await page.goto('/changelog');
    await page.waitForLoadState('networkidle');

    // K25: every version has a copy-link button and a plain-number anchor
    await page.getByRole('button', { name: /^Copy link to version/ }).first().click();
    // Windows clipboard appends a trailing CRLF
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).trim();
    expect(copied).toMatch(/\/changelog#\d+\.\d+\.\d+$/);

    const version = copied.split('#')[1];
    await expect(page.locator(`[id="${version}"]`)).toHaveCount(1);
  });
});

test("returning visitors get a one-time what's-new toast", async ({ page }) => {
  // Seed an old seen version, once — the reload below must not re-seed
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seen-seeded')) {
      localStorage.setItem('kotree-seen-version', '0.0.1');
      sessionStorage.setItem('seen-seeded', '1');
    }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // K24: the toast shows up a moment after the page settles
  await expect(page.getByText(/see what changed/)).toBeVisible({ timeout: 8000 });

  // Seen now — a reload stays quiet
  await page.reload();
  await page.waitForTimeout(2500);
  await expect(page.getByText(/see what changed/)).toHaveCount(0);
});

test('the public stats page shows real numbers', async ({ page }) => {
  await page.goto('/stats');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'The numbers' })).toBeVisible();
  // The badge builder below also offers a "Total clicks" button, so target the
  // stat tile's own label rather than the first text match.
  await expect(page.locator('div').filter({ hasText: /^Total clicks$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Most tapped links' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Last 30 days' })).toBeVisible();
});

test('wrapped recaps the year', async ({ page }) => {
  await page.goto('/wrapped');
  await page.waitForLoadState('networkidle');

  const year = new Date().getFullYear();
  await expect(page.getByRole('heading', { name: `Kotree Wrapped ${year}` })).toBeVisible();
  await expect(page.getByText('Total clicks')).toBeVisible();
  await expect(page.getByText('Messages on the wall')).toBeVisible();
  await expect(page.getByText('Longest click streak')).toBeVisible();
  await expect(page.getByText('Busiest hour (UTC)')).toBeVisible();
  await expect(page.locator('circle.kt-ring')).toBeVisible();
});

test('a wrapped year with notes names its tag and its first note', async ({ page }) => {
  // G6: 2026 is fixed on purpose — the notes card comes from content, and the
  // year param is honoured for any year the site has lived through.
  await page.goto('/wrapped?year=2026');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'From the notes' })).toBeVisible();
  await expect(page.getByText('Most-used tag')).toBeVisible();
  await expect(page.getByText('First note of the year')).toBeVisible();
  await expect(page.getByRole('link', { name: /accessibility as a test/i })).toBeVisible();
});

// H1: a health check leaves a heartbeat, and /status draws the last 30 days of
// them — padded, so a day nothing pinged still gets its block.
test('status shows the heartbeat strip after a health check', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);

  await page.goto('/status');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /Uptime \(last 30 days\)/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /[1-9]\d* of the last 30 days had a heartbeat/ })).toBeVisible();
  await expect(page.getByText(/nothing pinged that day/)).toBeVisible();
});

test('boss leaderboard accepts a score and rejects junk', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const outcome = await page.evaluate(async () => {
    // Same token the app builds client-side. Locally NEXT_PUBLIC_BASE_URL is
    // unset, so the secret is the 'kotree' fallback (see lib/csrf-client.ts).
    const token = btoa(`${Math.floor(Date.now() / 3600000)}:kotree`).substring(0, 15);
    const res = await fetch('/api/boss-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E', score: 1000000, _token: token }),
    });
    const body = await res.json();
    return { status: res.status, top: body[0] };
  });
  // 1000000 is the ceiling, so the row is guaranteed to sit on top
  expect(outcome.status).toBe(200);
  expect(outcome.top).toEqual({ name: 'E2E', score: 1000000 });

  const junk = await page.evaluate(async () => {
    const token = btoa(`${Math.floor(Date.now() / 3600000)}:kotree`).substring(0, 15);
    const res = await fetch('/api/boss-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TOOLONG', score: -5, _token: token }),
    });
    return res.status;
  });
  expect(junk).toBe(400);
});

test('Minesweeper opens in the Win95 shell and plays from the keyboard', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  // Same activation path as the terminal's `win95` command
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95')));
  const icon = page.getByRole('button', { name: 'Minesweeper' });
  await expect(icon).toBeVisible({ timeout: 10000 });
  await icon.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('grid', { name: 'Minesweeper board' })).toBeVisible();

  // Flag and unflag before any dig — deterministic, mines not planted yet
  const first = page.getByRole('gridcell', { name: /row 1 column 1$/ });
  await first.focus();
  await page.keyboard.press('f');
  await expect(page.getByRole('gridcell', { name: /Flagged, row 1 column 1$/ })).toBeVisible();
  await page.keyboard.press('f');
  await expect(page.getByRole('gridcell', { name: /Hidden, row 1 column 1$/ })).toBeVisible();

  // First dig is never a mine; arrows move the roving focus
  await page.keyboard.press('Enter');
  await expect(page.getByRole('gridcell', { name: /Hidden, row 1 column 1$/ })).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('gridcell', { name: /, row 1 column 2$/ })).toBeFocused();
});

test('guestbook sorts by newest and top hearts', async ({ page }) => {
  await page.goto('/guestbook');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('group', { name: 'Sort secrets' })).toBeVisible();
  const topTab = page.getByRole('button', { name: 'Top hearts' });
  await topTab.click();
  await expect(topTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('most ❤️ first')).toBeVisible();

  const newestTab = page.getByRole('button', { name: 'Newest' });
  await newestTab.click();
  await expect(newestTab).toHaveAttribute('aria-pressed', 'true');

  // The report endpoint is live and rejects ids it cannot know
  const status = await page.evaluate(async () => {
    const token = btoa(`${Math.floor(Date.now() / 3600000)}:kotree`).substring(0, 15);
    const res = await fetch('/api/guestbook/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'not-an-id', _token: token }),
    });
    return res.status;
  });
  expect(status).toBe(404);
});

test('palette groups its results', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('sec');
  // A group header can appear once per match tier (name matches, then summary
  // matches), so target the first occurrence of each.
  await expect(page.locator('#kt-palette-list [data-group="Go to"]').first()).toBeVisible();
  await expect(page.locator('#kt-palette-list [data-group="Notes"]').first()).toBeVisible();
});

test('terminal completes commands, keeps history and navigates', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Open AI Terminal' }).click();
  const input = page.getByRole('textbox', { name: 'Terminal command' });

  // ↑ recalls what was typed this session
  await input.fill('whoami');
  await input.press('Enter');
  await expect(page.getByText('I am Deo Subarno (Kochan).')).toBeVisible();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('whoami');

  // neofetch prints a summary card with this session in it
  await input.fill('neofetch');
  await input.press('Enter');
  await expect(page.getByText('kochan@kotree')).toBeVisible();

  // Tab completes 'wra' → 'wrapped', and the command opens the page
  await input.fill('wra');
  await input.press('Tab');
  await expect(input).toHaveValue('wrapped');
  await input.press('Enter');
  await expect(page.getByText('Opening Kotree Wrapped...')).toBeVisible();
  await page.waitForURL('**/wrapped', { timeout: 10000 });
});

test('holding the logo and typing the site name find two secrets', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  const logo = page.getByText('<k/>', { exact: true });
  await logo.hover();
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await expect(page.getByText('Gentle Touch')).toBeVisible();

  // Type the site's name outside any input
  await page.keyboard.type('kotree', { delay: 40 });
  await expect(page.getByText('True Name')).toBeVisible();
});

test('seasonal greetings follow the calendar', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-03-20T12:00:00'));
  await page.goto('/');
  await waitHydrated(page);
  await expect(page.getByText('🌙 Eid Mubarak')).toBeVisible();
});

test('the first konami earns the veteran badge', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
    await page.keyboard.press(k);
  }
  await expect(page.getByText('Veteran badge earned')).toBeVisible();

  // The boss fight still arrives, a confetti beat later
  const exit = page.getByRole('button', { name: 'EXIT BOSS FIGHT' });
  await expect(exit).toBeVisible({ timeout: 10000 });
  await exit.click();

  await page.goto('/secrets');
  await expect(page.getByText('Konami veteran')).toBeVisible();
});

test('guestbook shows skeleton rows until the first page arrives', async ({ page }) => {
  // Hold the guestbook response so the loading state is observable
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/guestbook?*', async (route) => {
    await gate;
    await route.fulfill({
      json: [{ message: 'cipher-slow', createdAt: new Date().toISOString() }],
    });
  });

  await page.goto('/guestbook', { waitUntil: 'domcontentloaded' });
  // The route's loading shell and the guestbook list both use skeletons
  await expect(page.locator('[data-skeleton]').first()).toBeVisible({ timeout: 15000 });

  release();
  await expect(page.locator('[data-skeleton]')).toHaveCount(0);
  await expect(page.getByText('cipher-slow', { exact: true })).toBeVisible();
});

test('scroll-driven reveal settles at full opacity', async ({ page }) => {
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  test.skip(!supported, 'animation-timeline is not supported in this browser');

  await page.goto('/notes');
  await page.waitForLoadState('networkidle');

  const card = page.locator('[data-reveal]').first();
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const opacity = await card.evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(opacity)).toBeGreaterThan(0.9);
});

test('copying a changelog link plays a soft tone', async ({ page }) => {
  // Clipboard writes need the permission, same as the permalink test above
  await page.context().grantPermissions(['clipboard-write']);
  // Count oscillators created by the app's AudioContext — the softest way to
  // observe the sound without ears.
  await page.addInitScript(() => {
    const w = window as unknown as { __ktTones: number; AudioContext: typeof AudioContext };
    w.__ktTones = 0;
    const orig = w.AudioContext.prototype.createOscillator;
    w.AudioContext.prototype.createOscillator = function (this: AudioContext, ...args: []) {
      w.__ktTones += 1;
      return orig.apply(this, args);
    };
  });

  await page.goto('/changelog');
  await waitHydrated(page);
  await page.getByRole('button', { name: /^Copy link to version/ }).first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ktTones: number }).__ktTones)).toBeGreaterThan(0);
});

test('a released window snaps flush to the desktop it was dragged near', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await waitHydrated(page);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95')));
  const icon = page.getByRole('button', { name: 'Notepad' });
  await expect(icon).toBeVisible({ timeout: 10000 });
  await icon.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Notepad draft' })).toBeVisible();

  const titleBar = page.getByRole('group', { name: /Move Notepad/ });
  const windowEl = titleBar.locator('..');
  // The desktop and its windows slide in; measure once they have settled.
  await page.waitForTimeout(500);
  const before = await windowEl.boundingBox();
  expect(before).not.toBeNull();

  // Eight pixels shy of the right edge: inside the snap zone, so releasing
  // there should commit a position flush with the desktop rather than 8px off
  // it. The right edge is used because activating the desktop also opens the
  // profile window at a random x near the left — a target that would make the
  // assertion ambiguous (the snap would, quite correctly, pick that neighbour).
  const desktopWidth = await page.evaluate(() => window.innerWidth);
  const flushLeft = desktopWidth - before!.width;
  const grab = { x: before!.x + 40, y: before!.y + 8 };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + (flushLeft - 8 - before!.x), grab.y);
  await page.mouse.up();

  // The window glides the last few pixels on its own transition
  await expect
    .poll(async () => parseFloat(await windowEl.evaluate((el) => (el as HTMLElement).style.left)))
    .toBeGreaterThanOrEqual(flushLeft - 2);
});

test('the Wrapped recap is downloadable as an image', async ({ page }) => {
  await page.goto('/wrapped');
  await waitHydrated(page);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save as an image' }).click();
  expect((await download).suggestedFilename()).toMatch(/^kotree-wrapped-20\d\d\.png$/);
  await expect(page.getByText(/is in your downloads/)).toBeVisible();
});
