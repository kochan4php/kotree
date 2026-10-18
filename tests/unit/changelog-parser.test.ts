import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChangelog } from '../../src/lib/changelog/parser.ts';

const SAMPLE = [
  '# Changelog',
  '',
  'All notable changes.',
  '',
  '## [3.3.0] - 2026-06-01',
  '',
  '### Added',
  '',
  '- A thing',
  '- Another thing',
  '',
  'Some prose.',
  '',
  '## [3.2.0] - 2026-05-01',
  '',
  '- Old thing',
].join('\n');

test('parseChangelog splits header, versions and blocks', () => {
  const { header, versions } = parseChangelog(SAMPLE);

  assert.deepEqual(header[0], { type: 'h1', text: 'Changelog' });
  assert.equal(versions.length, 2);

  assert.equal(versions[0].title, '[3.3.0] - 2026-06-01');
  assert.deepEqual(versions[0].blocks[0], { type: 'h3', text: 'Added' });
  assert.deepEqual(versions[0].blocks[1], { type: 'list', items: ['A thing', 'Another thing'] });
  assert.deepEqual(versions[0].blocks[2], { type: 'p', text: 'Some prose.' });

  assert.deepEqual(versions[1].blocks[0], { type: 'list', items: ['Old thing'] });
});

test('CRLF files parse exactly like LF ones', () => {
  assert.deepEqual(parseChangelog(SAMPLE.replace(/\n/g, '\r\n')), parseChangelog(SAMPLE));
});

test('empty input yields an empty changelog', () => {
  assert.deepEqual(parseChangelog(''), { header: [], versions: [] });
});
