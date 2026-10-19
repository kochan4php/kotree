import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, safeHref, type MarkdownBlock } from '../../src/lib/markdown-parse.ts';

// I4: the fuzz corpus. Content is written in the repo, but a paste buffer or a
// future contributor should not be able to turn markdown into script. Three
// properties hold everywhere below: the parser only emits typed blocks, React
// escapes every string it renders, and the one attribute fed by content (a
// link's href) is screened by safeHref.

const BLOCK_TYPES = new Set<MarkdownBlock['type']>([
  'h1',
  'h2',
  'h3',
  'p',
  'quote',
  'list',
  'code',
  'table',
  'callout',
  'footnotes',
]);

test('every hostile scheme in the corpus is refused', () => {
  const hostile = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' java\nscript:alert(1)',
    'java\tscript:alert(1)',
    'javascript\u0000:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'DATA:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    'blob:https://example.com/x',
    'about:blank',
    'java\rscript:alert(1)',
  ];
  for (const href of hostile) assert.equal(safeHref(href), null, JSON.stringify(href));
});

test('the links the site writes survive, relative ones included', () => {
  const allowed = [
    'https://example.com/path?q=1#frag',
    'HTTP://example.com',
    'mailto:hello@example.com',
    '/notes/2026-10-12-offline-first',
    '#reading',
    'notes/offline-first',
  ];
  for (const href of allowed) assert.equal(safeHref(href), href, href);
  assert.equal(safeHref('   '), null);
  assert.equal(safeHref(''), null);
});

test('raw HTML stays text: the parser has no HTML block', () => {
  const blocks = parseMarkdown(
    '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n<iframe src="https://evil.example"></iframe>',
  );
  assert.deepEqual(
    blocks.map((block) => block.type),
    ['p', 'p', 'p'],
  );
  const text = blocks.map((block) => (block.type === 'p' ? block.text : '')).join('\n');
  assert.match(text, /<script>alert\(1\)<\/script>/);
  assert.match(text, /<img src=x onerror=alert\(1\)>/);
  assert.match(text, /<iframe src="https:\/\/evil\.example"><\/iframe>/);
});

test('a hostile link keeps its label and loses only the href', () => {
  const blocks = parseMarkdown('[click me](javascript:alert(1))');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.type, 'p');
  // The parser is deliberately dumb about schemes; the renderer screens it
  assert.equal((blocks[0] as { text: string }).text, '[click me](javascript:alert(1))');
  assert.equal(safeHref('javascript:alert(1)'), null);
});

test('the metacharacter corpus never throws and never invents a block', () => {
  const alphabet = [
    '#', '*', '[', ']', '(', ')', '`', '>', '|', '-', '!', '\n', '\r\n', ' ',
    'a', 'http://', 'javascript:', '<', '>', '"', "'", '\\', '0', ':', ';', '?',
  ];
  let seed = 0x2f6e2b1;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };

  for (let round = 0; round < 400; round += 1) {
    const length = 1 + (next() % 90);
    let input = '';
    for (let i = 0; i < length; i += 1) input += alphabet[next() % alphabet.length];
    const blocks = parseMarkdown(input);
    assert.ok(Array.isArray(blocks));
    for (const block of blocks) {
      assert.ok(BLOCK_TYPES.has(block.type), `${block.type} from ${JSON.stringify(input)}`);
    }
  }
});

test('a thousand random hrefs can never come back with a script scheme', () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz:;/\\?#[]<>%.\n\t -_0123456789';
  let seed = 12345;
  const next = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed;
  };

  for (let round = 0; round < 1000; round += 1) {
    const length = 1 + (next() % 40);
    let raw = '';
    for (let i = 0; i < length; i += 1) raw += chars[next() % chars.length];
    const href = safeHref(raw);
    if (href === null) continue;
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href);
    if (scheme) {
      assert.ok(
        ['http', 'https', 'mailto'].includes(scheme[1].toLowerCase()),
        `${href} survived from ${JSON.stringify(raw)}`,
      );
    }
    // Nothing whitespace-like can survive into the attribute either
    assert.equal(/[\u0000-\u0020\u007F]/.test(href), false, JSON.stringify(raw));
  }
});
