import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base32Decode, sha256Hex, totpCode, verifyTotp } from '../../src/lib/totp.ts';

// RFC 6238 appendix B: the ASCII secret "12345678901234567890" in base32
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('base32Decode follows RFC 4648, padding optional', () => {
  const decoded = base32Decode(RFC_SECRET);
  assert.ok(decoded);
  assert.equal(new TextDecoder().decode(decoded), '12345678901234567890');
  assert.deepEqual(Array.from(base32Decode('MZXW6===')!), Array.from(new TextEncoder().encode('foo')));
  assert.deepEqual(Array.from(base32Decode('mzxw6')!), Array.from(new TextEncoder().encode('foo')));
  assert.equal(base32Decode('0189'), null); // 0, 1, 8 and 9 are not in the alphabet
  assert.equal(base32Decode(''), null);
});

test('totpCode matches the RFC 6238 test vectors (6-digit truncation)', async () => {
  const secret = base32Decode(RFC_SECRET)!;
  const vectors: [number, string][] = [
    [59, '287082'], // 94287082 -> last six
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ];
  for (const [seconds, expected] of vectors) {
    assert.equal(await totpCode(secret, seconds * 1000), expected);
  }
});

test('verifyTotp accepts the neighbouring steps but not the far ones', async () => {
  const at = 1111111109 * 1000;
  const code = await totpCode(base32Decode(RFC_SECRET)!, at);
  assert.ok(await verifyTotp(RFC_SECRET, code, at));
  assert.ok(await verifyTotp(RFC_SECRET, code, at + 29_000)); // still inside the window
  assert.ok(await verifyTotp(RFC_SECRET, code, at - 29_000));
  assert.ok(!(await verifyTotp(RFC_SECRET, code, at + 90_000)));
});

test('verifyTotp rejects malformed input instead of throwing', async () => {
  assert.ok(!(await verifyTotp(RFC_SECRET, 'nope', Date.now())));
  assert.ok(!(await verifyTotp(RFC_SECRET, '12345', Date.now()))); // five digits
  assert.ok(!(await verifyTotp('not-base32!', '123456', Date.now())));
  assert.ok(!(await verifyTotp(RFC_SECRET, '999999', 60_000))); // wrong code, right shape
});

test('sha256Hex is the standard digest', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
