// M84: the free accent picker validates before it stores — these tests pin the
// maths (WCAG pairs) and fuzz the guarantee (every derivable accent clears AA
// on the light surface, for real, before anything reaches the DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INK_SURFACES, accentForeground, contrastRatio, deriveAccent, parseHex } from '../../src/lib/colour.ts';

test('parseHex accepts full six-digit hex and its short three-digit form', () => {
  assert.deepEqual(parseHex('#ff7c47'), { r: 255, g: 124, b: 71 });
  assert.deepEqual(parseHex('#FF7C47'), { r: 255, g: 124, b: 71 });
  assert.deepEqual(parseHex('#abc'), { r: 170, g: 187, b: 204 });
  assert.deepEqual(parseHex('#000'), { r: 0, g: 0, b: 0 });
  assert.equal(parseHex('#ffff'), null);
  assert.equal(parseHex('red'), null);
  assert.equal(parseHex('#gggggg'), null);
  assert.equal(parseHex(42), null);
  assert.equal(parseHex(undefined), null);
});

test('contrastRatio matches the WCAG reference pairs', () => {
  assert.equal(Number(contrastRatio('#000000', '#ffffff').toFixed(2)), 21);
  assert.equal(Number(contrastRatio('#ffffff', '#000000').toFixed(2)), 21);
  assert.equal(Number(contrastRatio('#777777', '#777777').toFixed(2)), 1);
  // The site's own ink on its cream paper
  assert.ok(contrastRatio('#14110f', '#fff7e9') > 15);
  // Malformed input yields 0, never a false pass
  assert.equal(contrastRatio('nope', '#ffffff'), 0);
});

test('every derived accent clears AA on the light surface (deterministic fuzz)', () => {
  let state = 20261018;
  const rand = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const hex = (value: number) => value.toString(16).padStart(2, '0');

  for (let round = 0; round < 300; round++) {
    const input = `#${hex(Math.floor(rand() * 256))}${hex(Math.floor(rand() * 256))}${hex(Math.floor(rand() * 256))}`;
    const derived = deriveAccent(input);
    assert.ok(derived, input);
    assert.equal(derived.hex, input.toLowerCase());
    assert.ok(
      contrastRatio(derived.inkLight, INK_SURFACES.light) >= 4.5,
      `light ink ${derived.inkLight} for ${input}`
    );
    assert.ok(contrastRatio(derived.foreground, derived.hex) >= 4.5, `foreground for ${input}`);
  }

  assert.equal(deriveAccent('tomato'), null);
  assert.equal(deriveAccent('#12345'), null);
});

test('the foreground respects brand ink first, pure black/white at the crossover', () => {
  assert.equal(accentForeground('#ff7c47'), '#14110f'); // orange sticker, dark ink
  assert.equal(accentForeground('#1a1613'), '#fff7e9'); // near-black, cream text
  const crossover = accentForeground('#7c7c7c');
  assert.ok(contrastRatio(crossover, '#7c7c7c') >= 4.5);
});
