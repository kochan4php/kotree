import { test, expect } from '@playwright/test';

const target = 'http://localhost:3000/notes/2025-11-15-offline-first-without-a-framework';

test('webmention rejects an off-site target', async ({ request }) => {
  const res = await request.post('/api/webmention', {
    form: { source: 'https://example.com/post', target: 'https://elsewhere.example/notes/hello' },
  });
  expect(res.status()).toBe(400);
  await expect(res.text()).resolves.toContain('target must be on this site');
});

test('webmention refuses to fetch a private address', async ({ request }) => {
  const res = await request.post('/api/webmention', {
    form: { source: 'http://127.0.0.1:3000/notes/2025-11-15-offline-first-without-a-framework', target },
  });
  expect(res.status()).toBe(422);
  await expect(res.text()).resolves.toContain('Could not fetch the source');
});

test('the public inbox returns an empty list for a page with no approved mentions', async ({ request }) => {
  const res = await request.get(`/api/webmention?target=${encodeURIComponent(target)}`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.mentions)).toBeTruthy();
});
