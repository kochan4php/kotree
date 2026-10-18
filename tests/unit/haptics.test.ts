import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFS, hapticPattern, soundAllowed } from '../../src/lib/prefs.ts';

test('hapticPattern rides the sound switches', () => {
  assert.equal(hapticPattern('tap', DEFAULT_PREFS), 15);
  assert.deepEqual(hapticPattern('alert', DEFAULT_PREFS), [12, 40, 12]);

  // M70: muting a kind mutes its buzz too, and the master switch wins
  assert.equal(hapticPattern('tap', { ...DEFAULT_PREFS, soundTaps: false }), null);
  assert.equal(hapticPattern('alert', { ...DEFAULT_PREFS, soundAlerts: false }), null);
  assert.equal(hapticPattern('alert', { ...DEFAULT_PREFS, sound: false }), null);
  assert.equal(soundAllowed('tap', DEFAULT_PREFS), true);
});
