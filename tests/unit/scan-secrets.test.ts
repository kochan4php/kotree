import { test } from 'node:test';
import assert from 'node:assert/strict';
// Plain .mjs script, imported for the shared scanner
import { scanText } from '../../scripts/scan-secrets.mjs';

test('a clean diff finds nothing', () => {
  const diff = ['diff --git a/src/lib/x.ts b/src/lib/x.ts', '+++ b/src/lib/x.ts', '+const answer = 42;'].join('\n');
  assert.deepEqual(scanText(diff), []);
});

test('real-shaped credentials are caught, with the file named', () => {
  const diff = [
    'diff --git a/.env b/.env',
    '+++ b/.env',
    '+GITHUB_TOKEN=ghp_' + 'a'.repeat(36),
    '+MONGODB_URL=mongodb+srv://user:hunter2@cluster0.abcd.mongodb.net/db',
    '+-----BEGIN RSA PRIVATE KEY-----',
    '+EYES=-what',
    '+jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw',
  ].join('\n');
  const findings = scanText(diff);
  const names = findings.map((f) => f.name);
  assert.ok(names.includes('GitHub token'));
  assert.ok(names.includes('MongoDB credentials in URL'));
  assert.ok(names.includes('private key block'));
  assert.ok(names.includes('JSON Web Token'));
  assert.equal(findings[0].file, '.env');
});

test('references and placeholders are not findings', () => {
  const diff = [
    '+++ b/ci.yml',
    '+ADMIN_TOKEN: process.env.ADMIN_TOKEN',
    '+ADMIN_TOKEN: e2e-admin-token-123',
    '+const key = "placeholder-value-here"',
  ].join('\n');
  assert.deepEqual(scanText(diff), []);
});

test('plain stdin text is scanned whole, not as a diff', () => {
  const line = 'slack=xoxb-1234567890-abcdefghij';
  assert.equal(scanText(line).length, 1);
  assert.equal(scanText('nothing to see').length, 0);
});
