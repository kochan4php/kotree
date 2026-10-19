// I5: a light load check for CI. Four workers fetch the cheap surfaces in a
// loop; the run fails on any non-2xx/3xx answer or when the p95 crosses
// LOAD_P95_MS (default 2500). It is a smoke test with a stopwatch, not a
// benchmark: it catches the day a page starts waiting on a slow query, which
// the single-request suites cannot see. /stats is on purpose — it is the page
// with the most Mongo work behind it.
//
// Usage: node scripts/load-check.mjs <baseUrl> [requests] [workers]
const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node scripts/load-check.mjs <baseUrl> [requests] [workers]');
  process.exit(2);
}

const requests = Number(process.argv[3] ?? 40);
const workers = Number(process.argv[4] ?? 4);
const budget = Number(process.env.LOAD_P95_MS ?? 2500);
const paths = ['/', '/notes', '/projects', '/stats', '/api/health'];

const timings = [];
const failures = [];

async function one(path) {
  const started = performance.now();
  try {
    const response = await fetch(`${base}${path}`, { redirect: 'manual' });
    const ms = performance.now() - started;
    if (response.status < 200 || response.status >= 400) {
      failures.push(`${path} -> ${response.status}`);
    } else {
      timings.push(ms);
    }
    // Drain the body so the connection goes back to the pool
    await response.arrayBuffer();
  } catch (error) {
    failures.push(`${path} -> ${error.message}`);
  }
}

// Warm-up: the first render of a dynamic route is always the slowest, and it
// is not what "steady state" means anywhere else in this repo.
for (const path of paths) await one(path);
timings.length = 0;
failures.length = 0;

const queue = Array.from({ length: requests }, (_, index) => paths[index % paths.length]);
await Promise.all(
  Array.from({ length: workers }, async () => {
    while (queue.length > 0) await one(queue.shift());
  }),
);

timings.sort((a, b) => a - b);
const at = (fraction) => timings[Math.min(timings.length - 1, Math.floor(timings.length * fraction))] ?? 0;
const median = at(0.5);
const p95 = at(0.95);

console.log(
  `load: ${requests} requests over ${paths.length} paths, ${workers} workers — median ${median.toFixed(0)}ms, p95 ${p95.toFixed(0)}ms (budget ${budget}ms)`,
);

if (failures.length > 0) {
  console.error(`failed requests:\n${failures.join('\n')}`);
  process.exit(1);
}
if (p95 > budget) {
  console.error(`p95 ${p95.toFixed(0)}ms is over the ${budget}ms budget`);
  process.exit(1);
}
