import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupCommits, renderDraft } from '../../scripts/changelog-draft.mjs';

const LOG = [
  'a1b2c3d|feat(pwa): android share target and a daily background refresh',
  'b2c3d4e|fix(a11y): focus ring never disappears behind the dock',
  'c3d4e5f|perf: trim the palette index payload',
  'd4e5f6a|test(unit): pin the TOTP RFC vectors',
  'e5f6a7b|docs: explain the restore drill',
  'f6a7b8c|chore(deps): bump mongodb to the latest patch',
  'a7b8c9d|docs(runbook): add the CSP incident walkthrough',
  'b8c9dae|Some plain-language commit without a type',
  'c9daebf|Merge branch main into feature',
  '',
].join('\n');

test('groupCommits groups by conventional type and keeps the hash', () => {
  const { buckets, total } = groupCommits(LOG);
  assert.equal(total, 8); // the merge line is dropped

  assert.deepEqual(buckets.get('Features'), ['- Android share target and a daily background refresh (`a1b2c3d`)']);
  assert.equal(buckets.get('Fixes')?.length, 2); // fix + perf share the bucket
  assert.equal(buckets.get('Quality')?.length, 1);
  assert.equal(buckets.get('Docs')?.length, 2);
  // Untyped subjects are not lost — they land in the catch-all bucket
  assert.ok(buckets.get('Chores')?.some((line) => line.includes('Some plain-language commit')));
});

test('renderDraft makes a human-editable skeleton', () => {
  const draft = renderDraft(LOG, { since: 'v3.3.0' });
  assert.match(draft, /^## Unreleased since v3\.3\.0/);
  assert.match(draft, /### Features/);
  assert.match(draft, /### Fixes/);
  assert.match(draft, /Human pass required/);
  assert.doesNotMatch(draft, /Merge branch/);
  // Empty groups are dropped, not printed as headings
  assert.doesNotMatch(draft, /### [A-Za-z]+\n\n### /);
});
