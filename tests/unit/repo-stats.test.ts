import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repoSlug, shapeRepo } from '../../src/lib/repo-stats.ts';

// G3: the route hands GitHub's answer straight to the browser, so both the
// door (which slugs get through) and the filter (which fields come out) are
// pinned here.

test('only an owner/name slug reaches GitHub', () => {
  for (const good of ['kochan4php/kotree', 'a/b', 'a.b-c_d/e.f-g_h']) {
    assert.equal(repoSlug(good), good);
  }
  for (const bad of [
    null,
    undefined,
    '',
    'kotree',
    '/kotree',
    'kochan4php/',
    'kochan4php/kotree/issues',
    'https://github.com/kochan4php/kotree',
    'owner/name?x=1',
    'a b/c',
    `${'x'.repeat(40)}/kotree`,
    `owner/${'x'.repeat(101)}`,
  ]) {
    assert.equal(repoSlug(bad), null, String(bad));
  }
});

test('the shaped answer carries the card’s numbers and nothing else', () => {
  const shaped = shapeRepo({
    full_name: 'kochan4php/kotree',
    description: 'A link-in-bio',
    stargazers_count: 42,
    forks_count: 7,
    open_issues_count: 3,
    language: 'TypeScript',
    pushed_at: '2026-10-18T12:00:00Z',
    owner: { login: 'kochan4php', email: 'secret@example.com' },
    private_payload: 'must not travel',
  });
  assert.deepEqual(shaped, {
    fullName: 'kochan4php/kotree',
    description: 'A link-in-bio',
    stars: 42,
    forks: 7,
    openIssues: 3,
    language: 'TypeScript',
    pushedAt: '2026-10-18T12:00:00Z',
  });
  assert.ok(!('private_payload' in (shaped as object)));
});

test('a broken or unexpected payload is refused, never half-shaped', () => {
  for (const payload of [null, undefined, 'text', 42, {}, { full_name: 7 }, []]) {
    assert.equal(shapeRepo(payload), null);
  }

  // Missing counts are zeroes rather than NaN, so the card never prints one
  const sparse = shapeRepo({ full_name: 'a/b' });
  assert.deepEqual(sparse, {
    fullName: 'a/b',
    description: null,
    stars: 0,
    forks: 0,
    openIssues: 0,
    language: null,
    pushedAt: null,
  });
});
