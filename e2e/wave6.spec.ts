import { test, expect, type Page } from '@playwright/test';
import { LUCKY_POOL } from '../src/lib/lucky';

// M48–M59: the wave-6 features — Win95 apps, terminal v3, the lucky 404,
// /explore, /qr, the quiz + badge cabinet and the badge endpoint.

async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle');
  let swConfirmed = true;
  await page
    .waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)), null, {
      timeout: 10000,
    })
    .catch(() => {
      swConfirmed = false;
    });
  await page.waitForTimeout(swConfirmed ? 300 : 2500);
}

async function bootWin95(page: Page) {
  await page.goto('/');
  await waitHydrated(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95')));
  await expect(page.getByRole('button', { name: 'Minesweeper' })).toBeVisible({ timeout: 10000 });
}

async function openDesktopApp(page: Page, name: string) {
  // Icons open on double-click or Enter — Enter sidesteps overlap with other windows
  const icon = page.getByRole('button', { name });
  await icon.focus();
  await page.keyboard.press('Enter');
}

test('Win95 Notepad keeps the draft when the window closes', async ({ page }) => {
  await bootWin95(page);

  await openDesktopApp(page, 'Notepad');
  const draft = page.getByRole('textbox', { name: 'Notepad draft' });
  await draft.fill('hello from 1995');

  await page.getByRole('button', { name: 'Close Notepad.exe' }).click();
  await expect(draft).toHaveCount(0);

  // The draft was saved the moment it changed
  await openDesktopApp(page, 'Notepad');
  await expect(page.getByRole('textbox', { name: 'Notepad draft' })).toHaveValue('hello from 1995');
});

test('Win95 Paint draws stroke points on a canvas', async ({ page }) => {
  await bootWin95(page);

  await openDesktopApp(page, 'Paint');
  // Full screen so the canvas is never under another window
  await page.getByRole('button', { name: 'Maximize Paint.exe' }).click();
  const canvas = page.getByLabel('Drawing canvas — draw with a pointer or touch');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('Pick a colour and draw')).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no box');
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 70, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByText(/\d+ stroke points/)).toBeVisible();
});

test('the Win95 calculator unlocks the Elite secret at 1337', async ({ page }) => {
  await bootWin95(page);

  await openDesktopApp(page, 'Calculator');
  const pad = page.getByRole('group', { name: 'Calculator — type digits and operators' });
  await pad.focus();
  // 1300 + 37 lands exactly on the number of hackers
  await page.keyboard.type('1300+37');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Calculator display')).toHaveText('1337');
  await expect(page.getByText('Secret found: Elite')).toBeVisible();
});

test('terminal v3: man pages, accent command, poll and lasting history', async ({ page }) => {
  await page.route('**/api/poll', (route) =>
    route.fulfill({
      json: {
        active: {
          id: 'e2e-poll',
          question: 'E2E question?',
          options: [
            { label: 'Yes', count: 2 },
            { label: 'No', count: 1 },
          ],
          total: 3,
          createdAt: '2026-10-18T00:00:00.000Z',
        },
        archive: [],
      },
    }),
  );
  await page.goto('/');
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Open AI Terminal' }).click();
  const input = page.getByRole('textbox', { name: 'Terminal command' });

  // man prints the manual page
  await input.fill('man accent');
  await input.press('Enter');
  await expect(page.getByText('accent <orange|pink|blue|green|violet|yellow> — recolour the whole site')).toBeVisible();

  await input.fill('theme dark');
  await input.press('Enter');
  await expect(page.getByText('Kotree now uses one light colour scheme.')).toBeVisible();

  // accent recolours the whole site
  await input.fill('accent pink');
  await input.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'pink');

  // poll fetches the question of the day
  await input.fill('poll');
  await input.press('Enter');
  await expect(page.getByText('Question: E2E question?')).toBeVisible();
  await expect(page.getByText('- Yes (2)')).toBeVisible();

  // the history outlives the tab
  await input.fill('whoami');
  await input.press('Enter');
  await page.reload();
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Open AI Terminal' }).click();
  const fresh = page.getByRole('textbox', { name: 'Terminal command' });
  await fresh.press('ArrowUp');
  await expect(fresh).toHaveValue('whoami');
});

test('the palette jumps straight into a past Wrapped year', async ({ page }) => {
  await page.goto('/');
  await waitHydrated(page);

  await page.getByRole('button', { name: 'Search links' }).click();
  await page.getByRole('textbox', { name: 'Search links' }).fill('wrapped 2025');
  await page.getByText('Open Kotree Wrapped 2025').click();
  await page.waitForURL('**/wrapped?year=2025');
  await expect(page.getByRole('heading', { name: 'Kotree Wrapped 2025' })).toBeVisible();
});

test('the 404 "Surprise me" button lands on a real page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  // The button is React: a click before hydration goes nowhere
  await waitHydrated(page);
  await page.getByRole('button', { name: 'Surprise me' }).click();
  await page.waitForURL((url) => url.pathname !== '/this-page-does-not-exist');
  const hrefs = LUCKY_POOL.map((entry) => entry.href);
  expect(hrefs).toContain(new URL(page.url()).pathname);
});

test('the explore map tracks discoveries', async ({ page }) => {
  await page.goto('/explore');
  await page.waitForLoadState('networkidle');

  // Opening the map is itself a discovery (M57)
  await expect(page.getByText('1 of 14 secrets found so far')).toBeVisible();
  await page.getByRole('link', { name: /^Secrets/ }).click();
  await page.waitForURL('**/secrets');
});

test('/qr renders a code and offers the SVG download', async ({ page }) => {
  await page.goto('/qr');
  await expect(page.getByRole('heading', { name: 'QR code' })).toBeVisible();
  await expect(page.locator('main svg').first()).toBeVisible();
  await waitHydrated(page);

  // The SVG is server-rendered, so the download button only answers once the
  // page has hydrated: retry the click instead of assuming the first one lands.
  await expect(async () => {
    const download = page.waitForEvent('download', { timeout: 2000 });
    await page.getByRole('button', { name: 'Download SVG' }).click();
    expect((await download).suggestedFilename()).toBe('kotree-qr.svg');
  }).toPass({ timeout: 20000 });
  await expect(page.getByText('SVG downloaded!')).toBeVisible();
});

test('the quiz scores five out of five and remembers the best', async ({ page }) => {
  await page.goto('/secrets');
  await page.waitForLoadState('networkidle');

  // The answer keys, straight from the questions
  for (const option of ['2022', '/uses', '` (backtick)', 'Secret message', 'On this device only']) {
    await page.getByRole('button', { name: option, exact: true }).click();
  }
  await expect(page.getByText('Quiz — 5/5')).toBeVisible();
  await expect(page.getByText('Perfect score — you know this place by heart.')).toBeVisible();

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('best 5/5')).toBeVisible();
});

test('progress exports to a file and imports back through the guard', async ({ page }) => {
  await page.goto('/secrets');
  await page.waitForLoadState('networkidle');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  expect((await download).suggestedFilename()).toBe('kotree-progress.json');
  await expect(page.getByText('Progress exported')).toBeVisible();

  await page.getByLabel('Import progress file').setInputFiles({
    name: 'progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ secrets: ['terminal'], visitDays: [], quizBest: 5, veteran: true, pollVoted: true }),
    ),
  });
  await expect(page.getByText('Progress imported')).toBeVisible();
  // veteran + quiz + poll earn three of the eight badges
  await expect(page.getByText('3/8 badges')).toBeVisible();

  // Junk files are refused, not crashed on
  await page.getByLabel('Import progress file').setInputFiles({
    name: 'junk.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ not json'),
  });
  await expect(page.getByText('Could not read that file as JSON')).toBeVisible();
});

test('badge endpoint serves SVG and refuses unknown kinds', async ({ request }) => {
  const clicks = await request.get('/api/badge/clicks.svg');
  expect(clicks.status()).toBe(200);
  expect(clicks.headers()['content-type'] ?? '').toContain('image/svg+xml');
  const body = await clicks.text();
  expect(body).toContain('<svg');
  expect(body).toContain('role="img"');

  const wrapped = await request.get('/api/badge/wrapped.svg');
  expect(wrapped.status()).toBe(200);

  const unknown = await request.get('/api/badge/nope.svg');
  expect(unknown.status()).toBe(404);
});
