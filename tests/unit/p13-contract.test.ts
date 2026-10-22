import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as slo } from '../../src/app/api/slo.json/route.ts';
import { GET as webmentionGet, POST as webmentionPost } from '../../src/app/api/webmention/route.ts';
import { GET as guestbookFeed } from '../../src/app/guestbook/feed.xml/route.ts';
import { GET as notesJson } from '../../src/app/api/notes.json/route.ts';

let ip = 1;
const solo = () => ({ 'x-forwarded-for': `198.51.100.${ip++}` });

test('the public note API names every note without shipping a body', async () => {
  const response = await notesJson(new Request('http://localhost:3000/api/notes.json'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.version, 1);
  assert.ok(body.notes.length > 0);
  assert.ok(body.notes.every((note: Record<string, unknown>) => !('body' in note) && !('content' in note)));
  assert.match(response.headers.get('access-control-allow-origin') ?? '', /\*/);
});

test('the SLO endpoint is machine-readable and keeps its promises explicit', async () => {
  const response = await slo();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.targets.monitorCoverage, 99.5);
  assert.equal(body.targets.lcpP75, 2500);
  assert.equal(typeof body.met.appErrors24h, 'boolean');
  assert.match(body.note, /not proof of downtime/);
});

test('the guestbook feed is XML and never prints a secret body', async () => {
  const response = await guestbookFeed();
  assert.ok([200, 503].includes(response.status));
  if (response.status === 200) {
    const xml = await response.text();
    assert.match(response.headers.get('content-type') ?? '', /xml/);
    assert.match(xml, /<rss/);
    assert.doesNotMatch(xml, /ciphertext|encrypted|secretBody/i);
  }
});

test('webmention refuses off-site targets and private sources', async () => {
  const offSite = await webmentionPost(
    new Request('http://localhost:3000/api/webmention', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...solo() },
      body: new URLSearchParams({ source: 'https://example.com/post', target: 'https://elsewhere.example/notes/hello' }),
    }),
  );
  assert.equal(offSite.status, 400);

  const privateSource = await webmentionPost(
    new Request('http://localhost:3000/api/webmention', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...solo() },
      body: JSON.stringify({ source: 'http://127.0.0.1:3000/notes', target: 'http://localhost:3000/notes/hello' }),
    }),
  );
  assert.equal(privateSource.status, 422);

  const empty = await webmentionGet(
    new Request(`http://localhost:3000/api/webmention?target=${encodeURIComponent('https://elsewhere.example/notes/hello')}`),
  );
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { mentions: [] });
});
