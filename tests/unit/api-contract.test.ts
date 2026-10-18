// M75: contract tests — call every importable public route handler directly
// with a Request and pin the response shape. The two Mongo-backed GETs accept
// their documented fail-soft 500 so the suite runs with or without a database;
// everything else is deterministic. (health/1 stays in the e2e api.spec: its
// route reads package.json with a build-time import Next only understands.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST as cspReport } from '../../src/app/api/csp-report/route.ts';
import { POST as vitals } from '../../src/app/api/vitals/route.ts';
import { POST as pageview } from '../../src/app/api/pageview/route.ts';
import { POST as log } from '../../src/app/api/log/route.ts';
import { GET as badge } from '../../src/app/api/badge/[kind]/route.ts';
import { GET as guestbookGet, POST as guestbookPost } from '../../src/app/api/guestbook/route.ts';
import { GET as pollGet } from '../../src/app/api/poll/route.ts';
import { POST as report } from '../../src/app/api/guestbook/report/route.ts';
import { GET as clickCounts, POST as clickPost } from '../../src/app/api/click-link-counter/route.ts';
import { GET as bossGet } from '../../src/app/api/boss-scores/route.ts';
import { generateToken } from '../../src/lib/security.ts';

const ORIGIN = { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' };

// Every test gets its own limiter bucket: the keys are per IP.
let ipSuffix = 1;
const solo = () => ({ 'x-forwarded-for': `203.0.113.${ipSuffix++}` });

const post = (url: string, body: string, headers: Record<string, string> = {}) =>
  new Request(url, { method: 'POST', headers, body });

test('csp-report contract: 400 on junk, 204 on a report', async () => {
  assert.equal((await cspReport(post('http://localhost:3000/api/csp-report', 'nope', solo()))).status, 400);
  assert.equal((await cspReport(post('http://localhost:3000/api/csp-report', '{}', solo()))).status, 400);
  const valid = await cspReport(
    post(
      'http://localhost:3000/api/csp-report',
      JSON.stringify({ 'csp-report': { 'violated-directive': 'img-src', 'blocked-uri': 'https://x.test/a.png' } }),
      solo(),
    ),
  );
  assert.equal(valid.status, 204);
});

test('vitals contract: origin guard, body validation, 204 on a sample', async () => {
  assert.equal((await vitals(post('http://localhost:3000/api/vitals', '{}', solo()))).status, 403);
  assert.equal(
    (await vitals(post('http://localhost:3000/api/vitals', JSON.stringify({ path: 'nope' }), { ...ORIGIN, ...solo() }))).status,
    400,
  );
  assert.equal(
    (await vitals(post('http://localhost:3000/api/vitals', JSON.stringify({ path: '/', metrics: {} }), { ...ORIGIN, ...solo() })))
      .status,
    400,
  );
  const ok = await vitals(
    post('http://localhost:3000/api/vitals', JSON.stringify({ path: '/', metrics: { LCP: 1200 } }), { ...ORIGIN, ...solo() }),
  );
  assert.equal(ok.status, 204);
});

test('pageview contract: rejects bad paths, accepts a beacon', async () => {
  assert.equal((await pageview(post('http://localhost:3000/api/pageview', 'nope', { ...ORIGIN, ...solo() }))).status, 400);
  assert.equal(
    (await pageview(post('http://localhost:3000/api/pageview', JSON.stringify({ path: 'nope' }), { ...ORIGIN, ...solo() })))
      .status,
    400,
  );
  assert.equal(
    (
      await pageview(
        post('http://localhost:3000/api/pageview', JSON.stringify({ path: '/contract-test' }), { ...ORIGIN, ...solo() }),
      )
    ).status,
    204,
  );
});

test('log contract: rejects an empty message, accepts a real one', async () => {
  assert.equal(
    (await log(post('http://localhost:3000/api/log', JSON.stringify({ message: '  ' }), { ...ORIGIN, ...solo() }))).status,
    400,
  );
  const accepted = await log(
    post('http://localhost:3000/api/log', JSON.stringify({ message: 'contract test' }), { ...ORIGIN, ...solo() }),
  );
  assert.equal(accepted.status, 200);
  assert.equal(await accepted.text(), 'OK');
});

test('badge contract: 404 unknown kinds, SVG otherwise', async () => {
  const params = (kind: string) => ({ params: Promise.resolve({ kind }) });
  const missing = await badge(new Request('http://localhost:3000/api/badge/nope'), params('nope'));
  assert.equal(missing.status, 404);

  const ok = await badge(new Request('http://localhost:3000/api/badge/clicks.svg'), params('clicks.svg'));
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-type') ?? '', /image\/svg\+xml/);
  assert.match(ok.headers.get('cache-control') ?? '', /max-age=3600/);
  assert.match(await ok.text(), /<svg/);
});

test('guestbook contract: wall shape, origin guard, honeypot', async () => {
  const wall = await guestbookGet(new Request('http://localhost:3000/api/guestbook?limit=2', { headers: solo() }));
  assert.ok([200, 500].includes(wall.status), `unexpected status ${wall.status}`);
  if (wall.status === 200) {
    assert.ok(Array.isArray(await wall.json()));
    assert.ok(wall.headers.get('etag'));
    assert.match(wall.headers.get('cache-control') ?? '', /no-cache/);
  } else {
    assert.ok('error' in (await wall.json()));
  }

  assert.equal((await guestbookPost(post('http://localhost:3000/api/guestbook', '{}', solo()))).status, 403);
  assert.equal(
    (await guestbookPost(post('http://localhost:3000/api/guestbook', JSON.stringify({}), { ...ORIGIN, ...solo() }))).status,
    400,
  );
  const trapped = await guestbookPost(
    post('http://localhost:3000/api/guestbook', JSON.stringify({ _honeypot: true }), { ...ORIGIN, ...solo() }),
  );
  assert.equal(trapped.status, 200);
});

test('poll contract: payload shape or the documented failure', async () => {
  const res = await pollGet(new Request('http://localhost:3000/api/poll', { headers: solo() }));
  assert.ok([200, 500].includes(res.status), `unexpected status ${res.status}`);
  if (res.status === 200) {
    const body = await res.json();
    assert.ok('active' in body && 'archive' in body);
    assert.ok(Array.isArray(body.archive));
  } else {
    assert.ok('error' in (await res.json()));
  }
});

test('guestbook report contract: CSRF and id validation before any write', async () => {
  assert.equal((await report(post('http://localhost:3000/api/guestbook/report', JSON.stringify({ id: 'x' }), { ...ORIGIN, ...solo() }))).status, 403);
  const badId = await report(
    post('http://localhost:3000/api/guestbook/report', JSON.stringify({ id: 42, _token: generateToken() }), {
      ...ORIGIN,
      ...solo(),
    }),
  );
  assert.equal(badId.status, 400);
});

test('click counters contract: array on GET, origin guard on POST', async () => {
  const counts = await clickCounts();
  assert.ok(Array.isArray(await counts.json()));
  assert.equal((await clickPost(post('http://localhost:3000/api/click-link-counter', '{}', solo()))).status, 403);
});

test('boss leaderboard contract: always an array', async () => {
  const res = await bossGet(new Request('http://localhost:3000/api/boss-scores', { headers: solo() }));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(await res.json()));
});
