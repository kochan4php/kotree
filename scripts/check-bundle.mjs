// Bundle budget: fails when the client JS shipped in .next/static grows past
// the budget. Sizes are raw bytes on disk (pre-gzip, .br/.gz siblings not
// counted). Raise the numbers deliberately when shipping something worth its
// weight — never to make red go green.
//
// Chunk filenames are content-hashed, so per-chunk limits are keyed by rank
// (largest first). The baseline file is committed: it records the sizes of
// the previous commit's build, which turns every run into a diff report.
// Run `pnpm check:bundle --update-baseline` after a deliberate size change.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const STATIC_DIR = join(process.cwd(), '.next', 'static');
const BASELINE_FILE = join(process.cwd(), 'scripts', 'bundle-baseline.json');
const TOTAL_BUDGET = 2_000_000; // ≈1.9 MB for all client JS chunks combined
// Chunks largest-first; #1 is the lazy 3D/Doom chunk
const RANK_BUDGETS = [600_000, 450_000, 300_000, 220_000, 180_000];

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

const sizes = files
  .map((f) => ({
    path: relative(process.cwd(), f),
    size: statSync(f).size,
    // M7: what actually crosses the wire — Turbopack emits no per-route chunk
    // manifest, so the transfer size is the honest per-chunk signal instead.
    gzip: gzipSync(readFileSync(f)).length,
  }))
  .sort((a, b) => b.size - a.size);
const total = sizes.reduce((sum, f) => sum + f.size, 0);
const totalGzip = sizes.reduce((sum, f) => sum + f.gzip, 0);

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const signed = (n) => `${n >= 0 ? '+' : ''}${kb(n)}`;

let baseline = null;
try {
  baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
} catch {
  // First run on a fresh checkout — budgets still apply, diffs are skipped
}

const updateBaseline = process.argv.includes('--update-baseline');
if (updateBaseline) {
  writeFileSync(
    BASELINE_FILE,
    `${JSON.stringify(
      {
        // Sizes from the build this baseline was taken with
        total,
        top: sizes.slice(0, RANK_BUDGETS.length).map((f) => f.size),
      },
      null,
      2
    )}\n`
  );
}

let failed = false;

if (total > TOTAL_BUDGET) {
  console.error(`✗ total client JS ${kb(total)} exceeds budget ${kb(TOTAL_BUDGET)} (${files.length} files)`);
  failed = true;
}

RANK_BUDGETS.forEach((budget, i) => {
  const chunk = sizes[i];
  if (chunk && chunk.size > budget) {
    console.error(`✗ chunk #${i + 1} ${chunk.path} is ${kb(chunk.size)}, budget ${kb(budget)}`);
    failed = true;
  }
});

const rows = sizes.slice(0, 8).map((f, i) => {
  const budget = RANK_BUDGETS[i];
  const before = baseline?.top?.[i];
  const diff = before === undefined ? '—' : before === f.size ? '±0' : signed(f.size - before);
  return [
    String(i + 1).padStart(2),
    f.path,
    kb(f.size).padStart(10),
    kb(f.gzip).padStart(10),
    budget ? kb(budget).padStart(9) : '        —',
    diff.padStart(10),
  ].join('  ');
});

console.log('Chunk size table (largest first, diff vs committed baseline):');
console.log([' #', 'chunk'.padEnd(52), '     size', '   gzip', '   budget', '      diff'].join('  '));
for (const row of rows) console.log(row);

console.log(
  `Transfer total ${kb(totalGzip)} gzipped (${totalGzip > 0 ? ((totalGzip / total) * 100).toFixed(0) : '—'}% of raw)`
);

if (baseline) {
  console.log(
    `Total ${kb(total)} (${signed(total - baseline.total)} vs baseline), ${files.length} files`
  );
} else {
  console.log(`Total ${kb(total)}, ${files.length} files (no baseline — run with --update-baseline)`);
}

if (failed) {
  console.error('Bundle budget exceeded. Audit dynamic imports before raising the budget.');
  process.exit(1);
}
console.log('✓ bundle within budget');
