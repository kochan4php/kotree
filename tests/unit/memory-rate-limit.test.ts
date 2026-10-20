import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryRateLimited } from '../../src/lib/memory-rate-limit.ts';

test('memory limiter caps hits inside one fixed window', () => {
  const key = 'unit-window';
  assert.equal(memoryRateLimited(key, 2, 60_000), false);
  assert.equal(memoryRateLimited(key, 2, 60_000), false);
  assert.equal(memoryRateLimited(key, 2, 60_000), true);
});

test('memory limiter starts a fresh count in the next window', async () => {
  const key = 'unit-reset';
  assert.equal(memoryRateLimited(key, 1, 20), false);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(memoryRateLimited(key, 1, 20), false);
});
