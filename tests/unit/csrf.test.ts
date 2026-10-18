import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientToken } from '../../src/lib/csrf-client.ts';
import { generateToken } from '../../src/lib/security.ts';

test('clientToken is empty during server rendering', () => {
  assert.equal(clientToken(), '');
});

test('clientToken matches the server formula and rotates with the hour', () => {
  const g = globalThis as { window?: unknown };
  const realNow = Date.now;

  try {
    Date.now = () => 1_800_000_000_000;

    // generateToken only runs with no window (server side)
    const server = generateToken();
    g.window = {};
    const client = clientToken();

    assert.equal(client.length, 15);
    assert.match(client, /^[A-Za-z0-9+/]+={0,2}$/);
    assert.equal(client, server);

    Date.now = () => 1_800_000_000_000 + 3_600_000;
    assert.notEqual(clientToken(), client);
  } finally {
    Date.now = realNow;
    delete g.window;
  }
});
