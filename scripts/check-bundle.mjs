// Bundle budget: fails when the client JS shipped in .next/static grows past
// the budget. Sizes are raw bytes on disk (pre-gzip, .br/.gz siblings not
// counted). Raise the numbers deliberately when shipping something worth its
// weight — never to make red go green.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const STATIC_DIR = join(process.cwd(), '.next', 'static');
const TOTAL_BUDGET = 2_000_000; // ≈1.9 MB for all client JS chunks combined
const LARGEST_BUDGET = 600_000; // largest single lazy chunk (three.js / Doom)

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

let files;
try {
  files = walk(STATIC_DIR).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`check-bundle: no build found at ${STATIC_DIR} — run "pnpm build" first`);
  process.exit(1);
}

const sizes = files.map((f) => ({ path: relative(process.cwd(), f), size: statSync(f).size }));
const total = sizes.reduce((sum, f) => sum + f.size, 0);
const largest = sizes.reduce((max, f) => (f.size > max.size ? f : max), { path: '', size: 0 });

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
let failed = false;

if (total > TOTAL_BUDGET) {
  console.error(`✗ total client JS ${kb(total)} exceeds budget ${kb(TOTAL_BUDGET)} (${files.length} files)`);
  failed = true;
}
if (largest.size > LARGEST_BUDGET) {
  console.error(`✗ largest chunk ${largest.path} is ${kb(largest.size)}, budget ${kb(LARGEST_BUDGET)}`);
  failed = true;
}

if (failed) {
  console.error('Bundle budget exceeded. Audit dynamic imports before raising the budget.');
  process.exit(1);
}
console.log(`✓ bundle within budget: ${kb(total)} total across ${files.length} files, largest ${largest.path} at ${kb(largest.size)}`);
