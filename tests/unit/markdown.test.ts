import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractHeadings, parseMarkdown, readingMinutes } from '../../src/lib/markdown-parse.ts';

test('headings keep stable, unique, TOC-matching ids', () => {
  const blocks = parseMarkdown('# Title\n\n## Same\n\n## Same\n\n### Deeper\n');
  assert.deepEqual(extractHeadings(blocks), [
    { id: 'same', text: 'Same', level: 'h2' },
    { id: 'same-2', text: 'Same', level: 'h2' },
    { id: 'deeper', text: 'Deeper', level: 'h3' },
  ]);
});

test('fenced code captures language, lines and highlight ranges', () => {
  const [block] = parseMarkdown('```ts {1,3-4}\nconst a = 1;\n\nconst b = 2;\n```\n');
  if (!block || block.type !== 'code') throw new Error('expected a code block');
  assert.equal(block.lang, 'ts');
  assert.deepEqual(block.lines, ['const a = 1;', '', 'const b = 2;']);
  assert.deepEqual(block.highlight, [1, 3, 4]);
});

test('fences without a language stay plain text', () => {
  const [block] = parseMarkdown('```\njust words\n```\n');
  if (!block || block.type !== 'code') throw new Error('expected a code block');
  assert.equal(block.lang, '');
  assert.deepEqual(block.highlight, []);
});

test('tables parse header, separator and rows', () => {
  const [block] = parseMarkdown('| Name | Value |\n| --- | ---: |\n| a | 1 |\n| b | 2 |\n');
  if (!block || block.type !== 'table') throw new Error('expected a table');
  assert.deepEqual(block.head, ['Name', 'Value']);
  assert.deepEqual(block.rows, [
    ['a', '1'],
    ['b', '2'],
  ]);
});

test('callouts take the kind and merge continuation lines', () => {
  const [block] = parseMarkdown('> [!WARNING]\n> Mind the gap\n> on both sides.\n');
  assert.deepEqual(block, { type: 'callout', kind: 'warning', text: 'Mind the gap on both sides.' });

  const [unknown] = parseMarkdown('> [!SHRUG] does not compute\n');
  if (!unknown || unknown.type !== 'callout') throw new Error('expected a callout');
  assert.equal(unknown.kind, 'note');
});

test('footnote definitions land in one trailing block', () => {
  const blocks = parseMarkdown('Body with a ref[^1].\n\n[^1]: The note itself.\n');
  assert.deepEqual(blocks[0], { type: 'p', text: 'Body with a ref[^1].' });
  assert.deepEqual(blocks[blocks.length - 1], {
    type: 'footnotes',
    items: [{ id: '1', text: 'The note itself.' }],
  });
});

test('plain paragraphs, quotes and lists are unchanged', () => {
  const blocks = parseMarkdown('One line.\n\n- a\n- b\n\n> quoted\n');
  assert.deepEqual(blocks, [
    { type: 'p', text: 'One line.' },
    { type: 'list', items: ['a', 'b'] },
    { type: 'quote', text: 'quoted' },
  ]);
});

test('reading minutes count prose, never code', () => {
  const prose = parseMarkdown(Array.from({ length: 400 }, () => 'word').join(' '));
  assert.equal(readingMinutes(prose), 2);

  const withCode = parseMarkdown('```\n' + Array.from({ length: 2000 }, () => 'word').join(' ') + '\n```\n');
  assert.equal(readingMinutes(withCode), 1);
});
