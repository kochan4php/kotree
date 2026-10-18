import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBadgeSvg, escapeXml } from '../../src/lib/badge.ts';

test('escapeXml neutralises markup in every direction', () => {
  assert.equal(escapeXml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  assert.equal(escapeXml("it's & that"), 'it&apos;s &amp; that');
});

test('the badge never lets hostile text into the markup', () => {
  const svg = buildBadgeSvg({ label: 'kotree"><script>', value: '1 & 2' });
  assert.ok(svg.startsWith('<svg '));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&amp;'));
  assert.ok(svg.includes('role="img"'));
});

test('the width follows the text so the badge never clips', () => {
  const short = buildBadgeSvg({ label: 'a', value: 'b' });
  const long = buildBadgeSvg({ label: 'kotree wrapped', value: '12,345 in 2026' });
  const widthOf = (svg: string) => Number(svg.match(/width="(\d+)"/)?.[1]);
  assert.ok(widthOf(long) > widthOf(short));
});

test('the accessible name carries the full label and value', () => {
  const svg = buildBadgeSvg({ label: 'kotree', value: '42 clicks' });
  assert.ok(svg.includes('aria-label="kotree: 42 clicks"'));
});
