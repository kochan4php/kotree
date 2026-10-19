import { test, expect } from '@playwright/test';

// G1: reactions. Counted on the server, remembered per device, and closed to
// anything that is not a note or a project.

const PATH = '/notes/2026-10-12-offline-first';
const ORIGIN = { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' };

test('a reaction counts once and the device remembers it', async ({ page, request }) => {
  const before = (await (await request.get(`/api/reactions?path=${PATH}`)).json()) as Record<string, number>;
  const started = before.heart ?? 0;

  await page.goto(PATH);
  const heart = page.getByRole('button', { name: /love it/ });
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(heart).toContainText(String(started + 1));

  // Reloaded, the button still knows — and pressing again changes nothing
  await page.reload();
  await expect(page.getByRole('button', { name: /love it/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /love it/ }).click();
  await page.waitForTimeout(400);

  const after = (await (await request.get(`/api/reactions?path=${PATH}`)).json()) as Record<string, number>;
  expect(after.heart ?? 0).toBe(started + 1);
});

test('the API only counts notes and projects, and only known reactions', async ({ request }) => {
  const wrongPage = await request.post('/api/reactions', {
    headers: ORIGIN,
    data: { path: '/admin', kind: 'heart' },
  });
  expect(wrongPage.status()).toBe(400);
  const wrongKind = await request.post('/api/reactions', {
    headers: ORIGIN,
    data: { path: PATH, kind: 'banana' },
  });
  expect(wrongKind.status()).toBe(400);
  // No Origin and no same-origin fetch metadata: refused before anything else
  const noOrigin = await request.post('/api/reactions', { data: { path: PATH, kind: 'heart' } });
  expect(noOrigin.status()).toBe(403);
  const wrongRead = await request.get('/api/reactions?path=/status');
  expect(wrongRead.status()).toBe(400);
});
