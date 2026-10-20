#!/usr/bin/env node
// Verifies the security headers on a deployed URL (preview or production).
// Usage: node scripts/check-headers.mjs https://example.com
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('Usage: node scripts/check-headers.mjs <url>');
  process.exit(2);
}

const REQUIRED = [
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-frame-options',
];
const response = await fetch(base, {
  redirect: 'follow',
  signal: AbortSignal.timeout(20_000),
  headers: { 'user-agent': 'kotree-header-check/1.0' },
});
if (!response.ok) {
  console.error(`header check failed: ${response.status} ${base}`);
  process.exit(1);
}
const missing = REQUIRED.filter((name) => !response.headers.get(name));
const csp = response.headers.get('content-security-policy') ?? '';
if (!csp.includes("frame-ancestors 'none'")) {
  missing.push('csp frame-ancestors');
}
for (const name of missing) console.error(`missing header: ${name}`);
console.log(`${base}: ${response.status}, ${missing.length ? 'missing headers' : 'headers ok'}.`);
process.exitCode = missing.length ? 1 : 0;
