import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonWithEtag, weakEtag } from '../../src/lib/http-cache.ts';

test('the same body always gets the same weak etag', () => {
  assert.equal(weakEtag('{"a":1}'), weakEtag('{"a":1}'));
  assert.notEqual(weakEtag('{"a":1}'), weakEtag('{"a":2}'));
  assert.match(weakEtag('{}'), /^W\/"[a-f0-9]{20}"$/);
});

test('a matching validator gets a body-less 304 and keeps the caching headers', async () => {
  const first = jsonWithEtag(new Request('http://localhost/api/notes.json'), { notes: [] });
  assert.equal(first.status, 200);
  const tag = first.headers.get('etag');
  assert.ok(tag);

  const second = jsonWithEtag(
    new Request('http://localhost/api/notes.json', { headers: { 'if-none-match': tag } }),
    { notes: [] },
  );
  assert.equal(second.status, 304);
  assert.equal(second.headers.get('etag'), tag);
  assert.equal(await second.text(), '');

  const other = jsonWithEtag(
    new Request('http://localhost/api/notes.json', { headers: { 'if-none-match': 'W/"stale"' } }),
    { notes: [] },
  );
  assert.equal(other.status, 200);
  assert.deepEqual(await other.json(), { notes: [] });
});
