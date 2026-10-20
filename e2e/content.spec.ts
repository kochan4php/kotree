import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Wave 4 (M29–M39): feeds, sitemaps, structured data, microformats and the
// reading/print affordances. Content fixtures come from the repo itself so
// the tests never pin a specific note.

const CONTENT_DIR = path.join(process.cwd(), 'content');

function markdownFiles(dir: string): string[] {
  const full = path.join(CONTENT_DIR, dir);
  return fs.existsSync(full) ? fs.readdirSync(full).filter((file) => file.endsWith('.md')) : [];
}

function frontmatterOf(dir: string, file: string): Record<string, string> {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, dir, file), 'utf-8');
  const data: Record<string, string> = {};
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      for (const line of raw.slice(raw.indexOf('\n', 3), end).split('\n')) {
        const i = line.indexOf(':');
        if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
  }
  return data;
}

function anyNoteSlug(): string {
  const file = markdownFiles('notes')[0];
  if (!file) throw new Error('no notes');
  return file.replace(/\.md$/, '');
}

// The TOC (and the scroll-spy wiring) need at least two headings; today that
// is the project detail pages, but scan notes too in case content grows.
function pageWithHeadings(): string {
  for (const [dir, base] of [
    ['projects', '/projects'],
    ['notes', '/notes'],
  ] as const) {
    for (const file of markdownFiles(dir)) {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, dir, file), 'utf-8');
      if ((raw.match(/^#{2,3} /gm) ?? []).length >= 2) return `${base}/${file.replace(/\.md$/, '')}`;
    }
  }
  throw new Error('no page with two or more headings');
}

function firstTaggedNote(): { slug: string; tag: string; title: string } {
  for (const file of markdownFiles('notes')) {
    const data = frontmatterOf('notes', file);
    const tag = (data.tags ?? '').split(',')[0]?.trim();
    if (tag) return { slug: file.replace(/\.md$/, ''), tag, title: data.title ?? '' };
  }
  throw new Error('no tagged note');
}

const slugifyTag = (tag: string) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

test('server timing reports proxy and database work', async ({ request }) => {
  const page = await request.get('/');
  expect(page.headers()['server-timing']).toMatch(/proxy;dur=\d/);

  const health = await request.get('/api/health');
  expect(health.headers()['server-timing']).toMatch(/db;dur=\d/);
  expect(health.headers()['server-timing']).toMatch(/app;dur=\d/);
});

test.describe('feeds', () => {
  test('rss.xml carries full content and revalidation headers', async ({ request }) => {
    const res = await request.get('/rss.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');
    expect(res.headers().etag).toBeTruthy();
    expect(res.headers()['last-modified']).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('<content:encoded>');
    expect(body).toContain('<category>');
    expect(body).toContain('<lastBuildDate>');
    // Changelog items link to their page anchor, not a slugified title.
    expect(body).toMatch(/<link>[^<]*\/changelog#\d+\.\d+\.\d+<\/link>/);
    expect(body).toMatch(/<guid>[^<]*\/changelog#\d+\.\d+\.\d+<\/guid>/);
    expect(body).not.toContain('-stable</guid>');
  });

  test('feed.json is JSON Feed 1.1 with full html content', async ({ request }) => {
    const res = await request.get('/feed.json');
    expect(res.status()).toBe(200);
    const feed = (await res.json()) as {
      version: string;
      icon: string;
      favicon: string;
      items: { id: string; url: string; content_html?: string; date_published?: string }[];
    };
    expect(feed.version).toContain('jsonfeed.org/version/1.1');
    expect(feed.icon).toContain('/icons/');
    expect(feed.favicon).toContain('favicon');
    expect(feed.items.length).toBeGreaterThan(5);
    for (const item of feed.items) {
      expect(item.content_html).toBeTruthy();
      expect(item.date_published).toBeTruthy();
    }
    const releases = feed.items.filter((item) => item.url.includes('/changelog#'));
    expect(releases.length).toBeGreaterThan(5);
    for (const item of releases) {
      expect(item.id).toBe(item.url);
      expect(item.url).toMatch(/\/changelog#\d+\.\d+\.\d+$/);
    }
  });

  test('every tag has its own full-content feed', async ({ request }) => {
    const { slug, tag } = firstTaggedNote();
    const res = await request.get(`/notes/tags/${slugifyTag(tag)}/feed.xml`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('<rss');
    expect(body).toContain('<content:encoded>');
    expect(body).toContain(`/notes/${slug}`);
  });
});

test.describe('sitemaps', () => {
  test('the index points at the four sub-sitemaps', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text();
    expect(body).toContain('<sitemapindex');
    for (const name of ['sitemap-pages.xml', 'sitemap-notes.xml', 'sitemap-projects.xml', 'sitemap-tags.xml']) {
      expect(body).toContain(name);
    }
  });

  test('page sitemap lists the new reference pages', async ({ request }) => {
    const body = await (await request.get('/sitemap-pages.xml')).text();
    expect(body).toContain('/uses');
    expect(body).toContain('/links');
  });

  test('notes and projects carry image entries', async ({ request }) => {
    const notes = await (await request.get('/sitemap-notes.xml')).text();
    expect(notes).toContain('<image:image>');
    expect(notes).toContain('/og/note-');
    const projects = await (await request.get('/sitemap-projects.xml')).text();
    expect(projects).toContain('<image:image>');
    expect(projects).toContain('/og/project-');
  });

  test('tag sitemap lists both tag namespaces', async ({ request }) => {
    const body = await (await request.get('/sitemap-tags.xml')).text();
    expect(body).toContain('/notes/tags/');
    expect(body).toContain('/projects/tags/');
  });
});

test.describe('structured data', () => {
  test('notes carry BlogPosting JSON-LD', async ({ page }) => {
    await page.goto(`/notes/${anyNoteSlug()}`);
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = scripts.map((text) => JSON.parse(text) as Record<string, unknown>);
    const post = nodes.find((node) => node['@type'] === 'BlogPosting');
    expect(post).toBeTruthy();
    expect(post?.headline).toBeTruthy();
    expect(post?.datePublished).toBeTruthy();
    expect(post?.author).toBeTruthy();
  });

  test('the Kotree project is a WebApplication, in the page and in the markup', async ({ page }) => {
    await page.goto('/projects/kotree');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = scripts.map((text) => JSON.parse(text) as Record<string, unknown>);
    expect(nodes.some((node) => node['@type'] === 'WebApplication')).toBe(true);
  });

  // G3: the repository card reads our cached route, so the test stubs the
  // browser's half and never asks GitHub for anything.
  test('the project repository card shows the numbers it was given', async ({ page }) => {
    await page.route('**/api/repo-stats?*', (route) =>
      route.fulfill({
        json: {
          fullName: 'kochan4php/kotree',
          description: null,
          stars: 42,
          forks: 7,
          openIssues: 3,
          language: 'TypeScript',
          pushedAt: new Date().toISOString(),
        },
      })
    );
    await page.goto('/projects/kotree');
    await expect(page.getByText('kochan4php/kotree')).toBeVisible();
    await expect(page.getByText('42 stars')).toBeVisible();
    await expect(page.getByText('7 forks')).toBeVisible();
    await expect(page.getByText('3 open')).toBeVisible();
  });

  // A GitHub hole must leave the page alone, not a gap or an error
  test('the repository card stays quiet when the route fails', async ({ page }) => {
    await page.route('**/api/repo-stats?*', (route) => route.fulfill({ status: 502, json: { error: 'nope' } }));
    await page.goto('/projects/kotree');
    await expect(page.getByRole('heading', { level: 1, name: 'Kotree' })).toBeVisible();
    await expect(page.getByText('42 stars')).toHaveCount(0);
  });

  test('tag pages carry CollectionPage JSON-LD', async ({ page }) => {
    const { tag } = firstTaggedNote();
    await page.goto(`/notes/tags/${slugifyTag(tag)}`);
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes = scripts.map((text) => JSON.parse(text) as Record<string, unknown>);
    const collection = nodes.find((node) => node['@type'] === 'CollectionPage');
    expect(collection).toBeTruthy();
  });

  test('the global schema still has a Person with sameAs profiles', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const graph = scripts
      .map((text) => JSON.parse(text) as { '@graph'?: Record<string, unknown>[] })
      .flatMap((node) => node['@graph'] ?? []);
    const person = graph.find((node) => node['@type'] === 'Person') as { sameAs?: string[] } | undefined;
    expect(person).toBeTruthy();
    expect((person?.sameAs ?? []).length).toBeGreaterThan(3);
  });
});

test.describe('microformats', () => {
  test('notes expose an h-entry with name, date, author and content', async ({ page }) => {
    await page.goto(`/notes/${anyNoteSlug()}`);
    await expect(page.locator('.h-entry')).toHaveCount(1);
    await expect(page.locator('.h-entry .p-name')).toHaveCount(1);
    await expect(page.locator('.h-entry .dt-published')).toHaveCount(1);
    await expect(page.locator('.h-entry .p-author')).toHaveCount(1);
    await expect(page.locator('.h-entry .e-content')).toHaveCount(1);
  });

  test('home and about expose h-cards with names', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.h-card .p-name').first()).toBeVisible();
    await page.goto('/about');
    await expect(page.locator('.h-card .p-name').first()).toBeVisible();
  });
});

test.describe('reference pages and gallery', () => {
  test('uses lists the stack', async ({ page }) => {
    await page.goto('/uses');
    await expect(page.getByRole('heading', { level: 1, name: 'Uses' })).toBeVisible();
    await expect(page.getByText('Next.js 16')).toBeVisible();
  });

  test('links lists resources and the site tour', async ({ page }) => {
    await page.goto('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'Links' })).toBeVisible();
    await expect(page.getByText('MDN Web Docs')).toBeVisible();
    await expect(page.getByText('Share-card gallery')).toBeVisible();
  });

  test('the share-card gallery lists the generated cards', async ({ page }) => {
    await page.goto('/og');
    const cards = page.locator('img[alt^="Share card:"]');
    expect(await cards.count()).toBeGreaterThan(10);
  });

  test('humans.txt and security.txt are complete', async ({ request }) => {
    const humans = await (await request.get('/humans.txt')).text();
    expect(humans).toContain('/* TEAM */');
    expect(humans).toContain('/* SITE */');
    const security = await (await request.get('/.well-known/security.txt')).text();
    expect(security).toContain('Policy:');
    expect(security).toContain('Expires:');
  });
});

test.describe('reading aids', () => {
  test('headings offer a copy-link button and the TOC is wired for scroll-spy', async ({ page }) => {
    await page.goto(pageWithHeadings());
    const anchor = page.locator('[data-heading-anchor]').first();
    await expect(anchor).toBeVisible();
    await expect(anchor).toHaveAttribute('aria-label', 'Copy link to this section');

    const scope = (await page.locator('.h-entry').getAttribute('style')) ?? '';
    expect(scope).toContain('view-timeline-scope');

    const tocLink = page.locator('.kt-toc-link').first();
    await expect(tocLink).toBeVisible();
    const style = (await tocLink.getAttribute('style')) ?? '';
    expect(style).toContain('--kt-tl');
  });

  test('print hides the interactive chrome and footnotes external URLs', async ({ page }) => {
    await page.goto(pageWithHeadings());
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-heading-anchor]').first()).toBeHidden();

    await page.goto('/uses');
    const link = page.locator('main a[href^="https://nextjs.org"]').first();
    const after = await link.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after).toContain('nextjs.org');
    await page.emulateMedia({ media: 'screen' });
  });
});
