// M73: the rating thresholds the /api/vitals route and the admin dashboard
// both rely on — pinned at the exact boundaries so nobody tunes one side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VITAL_THRESHOLDS, rateVital } from '../../src/lib/vitals.ts';

test('rating sits on the boundary: > good is ni, > poor is poor', () => {
  assert.equal(rateVital('LCP', 2500), 'good');
  assert.equal(rateVital('LCP', 2501), 'ni');
  assert.equal(rateVital('LCP', 4000), 'ni');
  assert.equal(rateVital('LCP', 4001), 'poor');

  assert.equal(rateVital('CLS', 0.1), 'good');
  assert.equal(rateVital('CLS', 0.26), 'poor');
  assert.equal(rateVital('INP', 200), 'good');
  assert.equal(rateVital('TTFB', 900), 'ni');
  assert.equal(rateVital('FCP', 3000), 'ni');
});

test('every advertised metric rates, unknown ones are neutral', () => {
  for (const metric of Object.keys(VITAL_THRESHOLDS)) {
    assert.equal(rateVital(metric, 0), 'good', metric);
  }
  assert.equal(rateVital('NOPE', 1), 'ni');
  assert.equal(rateVital('', 1), 'ni');
});
