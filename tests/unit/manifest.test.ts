import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest: {
  launch_handler: { client_mode: string };
  shortcuts: { name: string; url: string }[];
  icons: { sizes: string; purpose: string }[];
} = JSON.parse(readFileSync(new URL('../../public/manifest.json', import.meta.url), 'utf8'));

test('manifest v2 stays installable', () => {
  assert.equal(manifest.launch_handler.client_mode, 'navigate-existing');
  assert.ok(manifest.shortcuts.length >= 6);
  for (const shortcut of manifest.shortcuts) assert.ok(shortcut.url.startsWith('/'), shortcut.name);

  // Installability needs 192 + 512, and M85 wants a maskable mask
  const sizes = manifest.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose.includes('maskable')));
});
