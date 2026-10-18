import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline } from '../../src/lib/inline-markdown.ts';

test('plain text is one text token', () => {
  assert.deepEqual(parseInline('a quiet secret'), [{ type: 'text', text: 'a quiet secret' }]);
});

test('bold, italic and code parse in order', () => {
  assert.deepEqual(parseInline('**hi** there *wow* `npm i`'), [
    { type: 'bold', text: 'hi' },
    { type: 'text', text: ' there ' },
    { type: 'italic', text: 'wow' },
    { type: 'text', text: ' ' },
    { type: 'code', text: 'npm i' },
  ]);
});

test('bold wins over italic for double asterisks', () => {
  assert.deepEqual(parseInline('**not italic**'), [{ type: 'bold', text: 'not italic' }]);
});

test('bare URLs become links, trailing punctuation stays in the prose', () => {
  assert.deepEqual(parseInline('see https://example.com/x.'), [
    { type: 'text', text: 'see ' },
    { type: 'link', text: 'https://example.com/x', href: 'https://example.com/x' },
    { type: 'text', text: '.' },
  ]);
});

test('html-looking text is never interpreted', () => {
  assert.deepEqual(parseInline('<b>not bold</b>'), [{ type: 'text', text: '<b>not bold</b>' }]);
});

test('unmatched markers stay literal text', () => {
  assert.deepEqual(parseInline('2 * 3 = 6'), [{ type: 'text', text: '2 * 3 = 6' }]);
  assert.deepEqual(parseInline('a**b'), [{ type: 'text', text: 'a**b' }]);
});

test('script tags survive only as text tokens', () => {
  assert.deepEqual(parseInline('<script>alert(1)</script>'), [
    { type: 'text', text: '<script>alert(1)</script>' },
  ]);
});
