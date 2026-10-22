import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWebmentionSource, isPrivateAddress, parseWebmention } from '../../src/lib/webmention.ts';

const target = 'https://kotree.example/notes/hello';

test('a source that links to the target is accepted', () => {
  const html = `
    <html><head><title>My reply &amp; notes</title><meta name="author" content="Sam"></head>
    <body><article><p>I wrote about this <a href="https://kotree.example/notes/hello#section">here</a>.</p></article></body></html>`;
  const mention = parseWebmention(html, 'https://blog.example/post', target);
  assert.ok(mention);
  assert.equal(mention.title, 'My reply & notes');
  assert.equal(mention.author, 'Sam');
  assert.match(mention.excerpt, /I wrote about this/);
});

test('a source without the target is rejected', () => {
  const html = '<p>No link here. <a href="https://example.com/elsewhere">Elsewhere</a></p>';
  assert.equal(parseWebmention(html, 'https://blog.example/post', target), null);
});

test('a fragment or a trailing slash does not change the target', () => {
  const html = '<a href="https://kotree.example/notes/hello/">reply</a>';
  assert.ok(parseWebmention(html, 'https://blog.example/post', target));
});

test('private and link-local addresses are never fetched', () => {
  for (const address of [
    '127.0.0.1',
    '10.1.2.3',
    '192.168.1.1',
    '169.254.1.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:10.0.0.1',
    '::ffff:a00:1',
    '::ffff:192.168.1.1',
    '::ffff:c0a8:101',
    '::127.0.0.1',
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  for (const address of ['93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946', '::ffff:93.184.216.34', '::ffff:5db8:d822']) {
    assert.equal(isPrivateAddress(address), false, address);
  }
});

test('a source fetch rejects non-http schemes and local hosts before any request', async () => {
  await assert.rejects(fetchWebmentionSource('file:///etc/passwd'), /unsupported protocol/);
  await assert.rejects(fetchWebmentionSource('http://localhost:3000/notes'), /local host/);
  await assert.rejects(fetchWebmentionSource('http://127.0.0.1:3000/notes'), /private address/);
  await assert.rejects(fetchWebmentionSource('http://user:pass@example.com/notes'), /credentials/);
});
