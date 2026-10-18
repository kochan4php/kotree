import { test, expect } from '@playwright/test';

// M9: navigation hints stay cheap. The speculation rules may only target the
// content pages — they are cheap to render — and only on hover (moderate).
// /stats, /wrapped and /admin read live Mongo data, so prerendering them on a
// hover would just burn serverless time; this test guards against that drift.
test('speculation rules: cheap pages only, moderate eagerness', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[type="speculationrules"]').textContent();
  const rules = JSON.parse(raw ?? '{}') as {
    prerender?: { where: { href_matches: string }; eagerness: string }[];
  };
  const list = rules.prerender ?? [];
  expect(list.length).toBeGreaterThan(0);
  const cheapPages = ['/changelog', '/about', '/now', '/projects', '/notes', '/guestbook', '/secrets'];
  for (const rule of list) {
    expect(cheapPages).toContain(rule.where.href_matches);
    expect(rule.eagerness).toBe('moderate');
  }
});
