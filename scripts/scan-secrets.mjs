// M66: dependency-free secret scan. Reads a diff (or stdin) and fails when a
// credential-shaped string appears in added lines. The patterns are deliberately
// narrow — a scanner that cries wolf gets ignored, so every rule below has a
// known real-world prefix.
//
// Usage:
//   node scripts/scan-secrets.mjs                 # uncommitted changes (git diff HEAD)
//   node scripts/scan-secrets.mjs --range A...B   # a commit range (CI pull requests)
//   node scripts/scan-secrets.mjs --stdin         # pipe text in (tests, hooks)

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PATTERNS = [
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{22,}/],
  ['Stripe secret key', /\bsk-[A-Za-z0-9]{24,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['MongoDB credentials in URL', /mongodb(\+srv)?:\/\/[^:\s/@]+:[^@\s/]+@/],
  ['JSON Web Token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['assigned secret', /\b(?:ADMIN_TOKEN|API_KEY|APIKEY|CLIENT_SECRET|SECRET_KEY|PASSWORD|PASSWD|PRIVATE_KEY)\s*[:=]\s*["']?[A-Za-z0-9+/_=-]{12,}/i],
];

// Lines that are clearly references, placeholders or fixtures, not credentials.
// `e2e` keeps the test server's own throwaway token out of the report.
const SKIP_LINE = /process\.env|example|placeholder|redacted|dummy|fixture|e2e|testing/i;

export function scanText(text) {
  const findings = [];
  const source = String(text);
  // A pasted plain secret (stdin) is scanned whole; a diff only on added lines
  const looksLikeDiff = /^(diff --git|@@|\+\+\+ )/m.test(source);
  const lines = source.split(/\r?\n/);
  let file = 'input';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+++ b/')) {
      file = line.slice(6);
      continue;
    }
    if (looksLikeDiff && (!line.startsWith('+') || line.startsWith('+++'))) continue;
    if (SKIP_LINE.test(line)) continue;
    for (const [name, pattern] of PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ file, line: i + 1, name, snippet: line.replace(/^\+/, '').trim().slice(0, 80) });
        break; // one report per line is enough
      }
    }
  }
  return findings;
}

function readInput(args) {
  const rangeAt = args.indexOf('--range');
  if (rangeAt !== -1 && args[rangeAt + 1]) {
    return execFileSync('git', ['diff', args[rangeAt + 1]], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  }
  if (args.includes('--stdin')) {
    return readFileSync(0, 'utf8');
  }
  return execFileSync('git', ['diff', 'HEAD'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function main() {
  const args = process.argv.slice(2);
  let diff = '';
  try {
    diff = readInput(args);
  } catch {
    console.log('scan-secrets: no readable diff (not a git checkout?) — nothing to scan');
    process.exit(0);
  }
  const findings = scanText(diff);
  if (findings.length === 0) {
    console.log('scan-secrets: clean');
    process.exit(0);
  }
  console.error(`scan-secrets: ${findings.length} suspicious line(s):`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} — ${finding.name}: ${finding.snippet}`);
  }
  process.exit(1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  // Importing this module (unit tests) must not run the scan.
  main();
}
