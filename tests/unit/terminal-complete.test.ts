import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeCommand } from '../../src/components/ai-terminal/complete.ts';

test('command names complete when unambiguous', () => {
  assert.equal(completeCommand('stat'), 'stats');
  assert.equal(completeCommand('do'), 'doom');
  assert.equal(completeCommand('wi'), 'win95');
});

test('ambiguous prefixes extend to the shared prefix or stay put', () => {
  assert.equal(completeCommand('m'), null); // mute + man share only "m" — nothing gained
  assert.equal(completeCommand('ma'), 'man'); // unambiguous now
  assert.equal(completeCommand('mu'), 'mute'); // unmute does not start with "mu"
  assert.equal(completeCommand(''), null);
});

test('subcommands complete after theme, accent and man', () => {
  assert.equal(completeCommand('theme d'), 'theme dark');
  assert.equal(completeCommand('accent p'), 'accent pink');
  assert.equal(completeCommand('man th'), 'man theme');
  assert.equal(completeCommand('accent blue'), null); // already complete
});

test('nothing completes past the first argument', () => {
  assert.equal(completeCommand('search foo b'), null);
  assert.equal(completeCommand('ls x'), null);
  assert.equal(completeCommand('mute now'), null);
});
