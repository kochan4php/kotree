import { test, expect, type APIRequestContext } from '@playwright/test';

// H5: the privacy page is the self-service desk — the server copy of a
// device's guestbook messages can be read, downloaded and removed without an
// account or an email. The device token is the only proof of ownership, so a
// cross-site DELETE must be refused.

const ORIGIN = { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' };

// Same hourly form token the browser builds in src/lib/security.ts
const formToken = () =>
  Buffer.from(`${Math.floor(Date.now() / 3600000)}:kotree`).toString('base64').substring(0, 15);

async function post(request: APIRequestContext, message: string, owner: string, ip: string) {
  const response = await request.post('/api/guestbook', {
    headers: { ...ORIGIN, 'x-forwarded-for': ip },
    data: { message, _token: formToken(), owner },
  });
  expect(response.ok()).toBe(true);
}

test('a device can read and remove its own guestbook messages', async ({ request }) => {
  const ip = `10.7.7.${1 + Math.floor(Math.random() * 200)}`;
  const owner = `privacy-owner-${Date.now()}`;
  const mine = `privacy-mine-${Date.now()}`;
  const other = `privacy-other-${Date.now()}`;
  await post(request, mine, owner, ip);
  await post(request, other, `privacy-elsewhere-${Date.now()}`, ip);

  const exported = await request.get(`/api/privacy?owner=${encodeURIComponent(owner)}`);
  expect(exported.ok()).toBe(true);
  const messages = ((await exported.json()) as { entries?: { message: string }[] }).entries?.map(
    (entry) => entry.message
  );
  expect(messages).toContain(mine);
  expect(messages).not.toContain(other);

  // Removing is a mutation, so the origin guard answers first
  expect((await request.delete(`/api/privacy?owner=${encodeURIComponent(owner)}`)).status()).toBe(403);

  const removed = await request.delete(`/api/privacy?owner=${encodeURIComponent(owner)}`, {
    headers: ORIGIN,
  });
  expect(removed.ok()).toBe(true);
  expect(((await removed.json()) as { deleted?: number }).deleted).toBe(1);

  const wall = await request.get('/api/guestbook?limit=50');
  const wallMessages = ((await wall.json()) as { message: string }[]).map((entry) => entry.message);
  expect(wallMessages).not.toContain(mine);

  // A second press finds nothing left to remove
  const again = await request.delete(`/api/privacy?owner=${encodeURIComponent(owner)}`, {
    headers: ORIGIN,
  });
  expect(((await again.json()) as { deleted?: number }).deleted).toBe(0);
});

test('the privacy page renders the self-service desk', async ({ page }) => {
  await page.goto('/privacy');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Questions or removal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download my data' })).toBeEnabled({ timeout: 10000 });
  await expect(page.getByText('This browser has no live messages on the wall.')).toBeVisible();
});
