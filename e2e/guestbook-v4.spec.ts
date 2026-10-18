import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { encryptMessage } from '../src/components/guestbook/obfuscation';
import { currentTotpCode } from './helpers/totp';

// The webServer (playwright.config.ts) runs with ADMIN_TOKEN=e2e-admin-token
const TOKEN = 'e2e-admin-token';
const ORIGIN = { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' };

// These tests share global state (there is only ever one active poll, the
// moderation queue is one list) — run the file in order on one worker.
test.describe.configure({ mode: 'serial' });

// Same hydration gate as admin.spec.ts: fill()+click() before React hydrates
// leaves the UI inert under machine load.
async function waitHydrated(page: Page) {
  await page.waitForLoadState('networkidle');
  let swConfirmed = true;
  await page
    .waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)), null, { timeout: 10000 })
    .catch(() => {
      swConfirmed = false;
    });
  await page.waitForTimeout(swConfirmed ? 300 : 2500);
}

// Same hourly form token the browser builds in src/lib/security.ts
const formToken = () => Buffer.from(`${Math.floor(Date.now() / 3600000)}:kotree`).toString('base64').substring(0, 15);

// getClientIp trusts the LAST XFF hop — a per-test value keeps rate-limit
// buckets (and the ban test) away from every other test's traffic.
const hashIp = (ip: string) => createHash('sha256').update(ip).digest('hex').slice(0, 32);

// The admin bucket is 60 hits/minute per IP: give this worker its own so
// rapid re-runs never trip the limiter.
const RUN_XFF = `10.${1 + Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}.7`;

let seq = 0;
const uid = () => `${Date.now()}-${seq++}`;

async function postSecret(request: APIRequestContext, message: string, owner: string, ip?: string) {
  return request.post('/api/guestbook', {
    headers: { ...ORIGIN, ...(ip ? { 'x-forwarded-for': ip } : {}) },
    data: { message, _token: formToken(), owner },
  });
}

async function adminLogin(request: APIRequestContext): Promise<Record<string, string>> {
  const login = await request.post('/api/admin/session', {
    headers: { ...ORIGIN, 'x-forwarded-for': RUN_XFF },
    data: { token: TOKEN, code: await currentTotpCode() },
  });
  expect(login.ok()).toBe(true);
  const cookies = login.headers()['set-cookie'] ?? '';
  const csrf = /kotree-csrf=([^;]+)/.exec(cookies)?.[1] ?? '';
  expect(csrf).not.toBe('');
  return { 'x-csrf-token': csrf, ...ORIGIN, 'x-forwarded-for': RUN_XFF };
}

// Same hydration gate as admin.spec.ts: fill()+click() before React hydrates
// leaves the Connect button disabled forever under machine load.
async function openAdmin(page: Page) {
  await page.goto('/admin');
  await waitHydrated(page);
  await page
    .getByLabel('Admin token')
    .or(page.getByText('Connected.'))
    .first()
    .waitFor({ timeout: 10000 });
  const tokenField = page.getByLabel('Admin token');
  if (await tokenField.isVisible()) {
    await tokenField.fill(TOKEN);
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    // M60: the second factor is on in the e2e server
    const codeField = page.getByLabel('2FA code');
    const needsCode = await codeField
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (needsCode) {
      await codeField.fill(await currentTotpCode());
      await page.getByRole('button', { name: 'Connect', exact: true }).click();
    }
  }
  await expect(page.getByRole('heading', { name: 'Guestbook moderation' })).toBeVisible({ timeout: 15000 });
}

test('the author can delete their own secret; others cannot (M40)', async ({ request }) => {
  const owner = `owner-a-${uid()}`;
  const created = await postSecret(request, `del-a-${uid()}`, owner, '10.0.1.1');
  expect(created.status()).toBe(200);
  const { id } = await created.json();
  expect(typeof id).toBe('string');

  const wrong = await request.delete(`/api/guestbook?id=${id}&owner=someone-else-999`, { headers: ORIGIN });
  expect(wrong.status()).toBe(404);

  const right = await request.delete(`/api/guestbook?id=${id}&owner=${owner}`, { headers: ORIGIN });
  expect(right.ok()).toBe(true);

  const wall = await (await request.get('/api/guestbook?limit=50')).json();
  expect(wall.some((entry: { id: string }) => entry.id === id)).toBe(false);

  // The soft delete keeps the row with its audit fields, visible to the admin
  const adminHeaders = await adminLogin(request);
  const overview = await (await request.get('/api/admin/overview?section=moderation', { headers: adminHeaders })).json();
  const row = overview.guestbook.find((entry: { id: string }) => entry.id === id);
  expect(row.deleted).toBe(true);
});

test('the author can edit inside the window; history is kept (M41)', async ({ request }) => {
  const owner = `owner-b-${uid()}`;
  const before = `edit-b-${uid()}`;
  const after = `edited-${uid()}`;
  const { id } = await (await postSecret(request, before, owner, '10.0.1.2')).json();

  const wrong = await request.put('/api/guestbook', {
    headers: ORIGIN,
    data: { id, owner: 'someone-else-999', message: after, _token: formToken() },
  });
  expect(wrong.status()).toBe(404);

  const ok = await request.put('/api/guestbook', {
    headers: ORIGIN,
    data: { id, owner, message: after, _token: formToken() },
  });
  expect(ok.ok()).toBe(true);

  const wall = await (await request.get('/api/guestbook?limit=50')).json();
  const entry = wall.find((e: { id: string }) => e.id === id);
  expect(entry.message).toBe(after);
  expect(entry.edited).toBe(true);

  await adminLogin(request);
  const overview = await (await request.get('/api/admin/overview?section=moderation', { headers: { ...ORIGIN, 'x-forwarded-for': RUN_XFF } })).json();
  const row = overview.guestbook.find((e: { id: string }) => e.id === id);
  expect(row.history.length).toBe(1);
  expect(row.history[0].message).toBe(before);
});

test('reactions accept five emojis and dedupe per visitor-day (M46)', async ({ request }) => {
  const { id } = await (await postSecret(request, `react-c-${uid()}`, `owner-c-${uid()}`, '10.0.1.3')).json();

  const first = await request.patch('/api/guestbook', {
    headers: ORIGIN,
    data: { id, reaction: '🤯', _token: formToken() },
  });
  expect(first.ok()).toBe(true);
  expect((await first.json()).counted).toBe(true);

  // A second reaction the same day is idempotent success but not counted
  const again = await request.patch('/api/guestbook', {
    headers: ORIGIN,
    data: { id, reaction: '😂', _token: formToken() },
  });
  expect(again.ok()).toBe(true);
  expect((await again.json()).counted).toBe(false);

  const wall = await (await request.get('/api/guestbook?limit=50')).json();
  const entry = wall.find((e: { id: string }) => e.id === id);
  expect(entry.reactions['🤯']).toBe(1);
  expect(entry.reactions['😂']).toBeUndefined();
});

test('the admin can reply to a secret and clear the reply (M43)', async ({ request }) => {
  const { id } = await (await postSecret(request, `reply-d-${uid()}`, `owner-d-${uid()}`, '10.0.1.4')).json();
  const adminHeaders = await adminLogin(request);

  const replied = await request.patch('/api/admin/guestbook', {
    headers: adminHeaders,
    data: { id, reply: 'Thanks for sharing!' },
  });
  expect(replied.ok()).toBe(true);

  let wall = await (await request.get('/api/guestbook?limit=50')).json();
  let entry = wall.find((e: { id: string }) => e.id === id);
  expect(entry.reply.message).toBe('Thanks for sharing!');

  const cleared = await request.patch('/api/admin/guestbook', {
    headers: adminHeaders,
    data: { id, reply: '' },
  });
  expect(cleared.ok()).toBe(true);
  wall = await (await request.get('/api/guestbook?limit=50')).json();
  entry = wall.find((e: { id: string }) => e.id === id);
  expect(entry.reply).toBeUndefined();
});

test('the admin runs a poll visitors can vote on once a day (M44)', async ({ request }) => {
  const adminHeaders = await adminLogin(request);
  const question = `e2e poll ${uid()}`;
  const created = await request.post('/api/admin/poll', {
    headers: adminHeaders,
    data: { question, options: ['Alpha', 'Beta'] },
  });
  expect(created.ok()).toBe(true);
  const { id: pollId } = await created.json();

  const before = await (await request.get('/api/poll')).json();
  expect(before.active.id).toBe(pollId);
  expect(before.active.total).toBe(0);

  const vote = (ip: string) =>
    request.post('/api/poll', {
      headers: { ...ORIGIN, 'x-forwarded-for': ip },
      data: { pollId, optionIndex: 1, _token: formToken() },
    });

  const first = await vote('10.0.2.1');
  expect(first.ok()).toBe(true);
  expect((await first.json()).active.options[1].count).toBe(1);

  // Second vote from the same visitor-day: rejected
  const duplicate = await vote('10.0.2.1');
  expect(duplicate.status()).toBe(409);

  // Another visitor adds to the same poll
  const second = await vote('10.0.2.2');
  expect(second.ok()).toBe(true);
  expect((await second.json()).active.total).toBe(2);

  const closed = await request.delete('/api/admin/poll', { headers: adminHeaders });
  expect(closed.ok()).toBe(true);
  const after = await (await request.get('/api/poll')).json();
  expect(after.active).toBeNull();
  expect(after.archive.some((poll: { id: string }) => poll.id === pollId)).toBe(true);
});

test('a banned IP-hash is turned away until the ban is lifted (M47)', async ({ request }) => {
  const ip = '10.0.3.7';
  const ipHash = hashIp(ip);
  const owner = `owner-f-${uid()}`;
  const adminHeaders = await adminLogin(request);

  // A failed earlier run must not leave the test IP banned
  await request.post('/api/admin/guestbook', { headers: adminHeaders, data: { ipHash, action: 'unban' } });

  const fresh = await postSecret(request, `ban-f-${uid()}`, owner, ip);
  expect(fresh.ok()).toBe(true);

  const banned = await request.post('/api/admin/guestbook', {
    headers: adminHeaders,
    data: { ipHash, action: 'ban' },
  });
  expect(banned.ok()).toBe(true);

  const blocked = await postSecret(request, `ban-f-${uid()}`, owner, ip);
  expect(blocked.status()).toBe(403);

  const unbanned = await request.post('/api/admin/guestbook', {
    headers: adminHeaders,
    data: { ipHash, action: 'unban' },
  });
  expect(unbanned.ok()).toBe(true);

  const allowed = await postSecret(request, `ban-f-${uid()}`, owner, ip);
  expect(allowed.ok()).toBe(true);
});

test('revealed secrets render markdown-lite and five reactions (M42/M46)', async ({ page }) => {
  const marker = `md-${uid()}`;
  await page.goto('/guestbook');
  await waitHydrated(page);
  await page.getByLabel('Secret message').fill(`**bold-${marker}** *it* \`code\``);
  await page.getByRole('button', { name: 'Send message' }).click();

  const entry = page.locator('div[id^="secret-"]').first();
  await expect(entry).toBeVisible({ timeout: 10000 });
  // Wait for the server id: the optimistic entry is re-keyed when the POST
  // resolves, which would strand a click mid-swap; reactions render with the id.
  await expect(entry).toHaveAttribute('id', /^secret-[a-f0-9]{24}$/, { timeout: 10000 });
  expect(await entry.locator('button[aria-label^="React with"]').count()).toBe(5);

  await entry.locator('button').first().click();
  await expect(entry.locator('strong')).toHaveText(`bold-${marker}`);
  await expect(entry.locator('em')).toHaveText('it');
  await expect(entry.locator('code')).toHaveText('code');
});

test('own secrets can be edited, filtered by URL, and deleted (M40/M41/M45)', async ({ page }) => {
  const marker = `own-${uid()}`;
  await page.goto('/guestbook');
  await waitHydrated(page);
  await page.getByLabel('Secret message').fill(marker);
  await page.getByRole('button', { name: 'Send message' }).click();

  const entry = page.locator('div[id^="secret-"]').first();
  await expect(entry).toBeVisible({ timeout: 10000 });
  // Wait for the optimistic entry to adopt the server id (ownership buttons
  // only appear once the POST has come back)
  await expect(entry).toHaveAttribute('id', /^secret-[a-f0-9]{24}$/, { timeout: 10000 });
  const entryId = await entry.getAttribute('id');

  // M41: inline edit, then the EDITED marker appears
  await entry.getByRole('button', { name: 'Edit your secret' }).click();
  await entry.getByLabel('Edit your secret').fill(`${marker}-v2`);
  await entry.getByRole('button', { name: 'Save edit' }).click();
  await expect(entry.getByText('EDITED')).toBeVisible({ timeout: 10000 });

  // M45: search narrows the wall and lands in the URL
  await page.getByLabel('Search secrets').fill(`${marker}-v2`);
  await expect(page).toHaveURL(new RegExp(`q=${marker}-v2`));
  await expect(page.locator('div[id^="secret-"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'clear' }).click();
  await expect(page).toHaveURL(/\/guestbook$/);

  // M45: "on this day" keeps a fresh entry and shows in the URL
  await page.getByRole('button', { name: 'On this day' }).click();
  await expect(page).toHaveURL(/kind=today/);
  await expect(page.locator(`#${entryId}`)).toBeVisible();
  await page.getByRole('button', { name: 'All' }).click();

  // M40: two-step delete removes it from the wall
  await page.locator(`#${entryId}`).getByRole('button', { name: 'Delete your secret' }).click();
  await page.locator(`#${entryId}`).getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.locator(`#${entryId}`)).toHaveCount(0, { timeout: 10000 });
});

test('the poll card shows the question, votes, and live results (M44)', async ({ page, request }) => {
  const adminHeaders = await adminLogin(request);
  const question = `ui poll ${uid()}`;
  const created = await request.post('/api/admin/poll', {
    headers: adminHeaders,
    data: { question, options: ['Yes', 'No'] },
  });
  expect(created.ok()).toBe(true);

  await page.goto('/guestbook');
  await expect(page.getByText(question)).toBeVisible({ timeout: 10000 });
  await page.getByRole('radio', { name: 'No', exact: true }).click();
  await page.getByRole('button', { name: 'Vote' }).click();
  await expect(page.getByText('1 vote(s) so far')).toBeVisible({ timeout: 10000 });

  await request.delete('/api/admin/poll', { headers: adminHeaders });
});

test('moderation previews formatting and hides in bulk (M47)', async ({ page, request }) => {
  const marker = `mod-${uid()}`;
  // Seeded with the real obfuscation so the preview can decrypt it
  const cipher = encryptMessage(marker);
  const seeded = await postSecret(request, cipher, `owner-g-${uid()}`, '10.0.1.9');
  expect(seeded.ok()).toBe(true);

  await openAdmin(page);
  await page.getByLabel('Filter guestbook').fill(cipher);

  // Stable anchor: the row is the only one showing the ciphertext…
  const cipherRow = page.locator('ul > li').filter({ hasText: cipher });
  await expect(cipherRow).toHaveCount(1);

  // M47: preview decrypts and renders the formatting (the row now shows the
  // plain text, so re-anchor on it)
  await cipherRow.getByRole('button', { name: 'Preview formatted text' }).click();
  const row = page.locator('ul > li').filter({ hasText: marker });
  await expect(row.getByText(marker)).toBeVisible();

  // M47: bulk hide, then unhide the same entry again
  await row.getByRole('checkbox', { name: 'Select entry' }).check();
  await page.getByRole('button', { name: 'Hide selected (1)', exact: true }).click();
  await expect(row.getByText('hidden', { exact: true })).toBeVisible({ timeout: 10000 });
  await row.getByRole('button', { name: 'Unhide entry' }).click();
  await expect(row.getByText('hidden', { exact: true })).toHaveCount(0, { timeout: 10000 });
});
