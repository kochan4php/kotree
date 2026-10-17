// Post-deploy smoke test (R44): checks status codes and key content on the
// real URL. Usage: node scripts/smoke.mjs https://example.com
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('Usage: node scripts/smoke.mjs <url>');
  process.exit(2);
}

// [path, expectedStatus, needles in the body]
const CHECKS = [
  ['/', 200, ['Deo Subarno', 'Kotree']],
  ['/changelog', 200, ['Changelog']],
  ['/projects', 200, ['Projects']],
  ['/projects/kotree', 200, ['Kotree']],
  ['/notes', 200, ['Notes']],
  ['/about', 200, ['About']],
  ['/now', 200, ['Now']],
  ['/guestbook', 200, ['Guestbook']],
  ['/secrets', 200, ['Secrets']],
  ['/rss.xml', 200, ['<rss', '/notes/']],
  ['/sitemap.xml', 200, ['/projects/kotree', '/notes/']],
  ['/robots.txt', 200, ['Sitemap:']],
  ['/manifest.json', 200, ['Kotree']],
  ['/sw.js', 200, ['kotree-sync-queues']],
  ['/og.png', 200, []],
  ['/definitely-not-a-page', 404, []],
];

let failed = 0;
for (const [path, wantStatus, needles] of CHECKS) {
  try {
    const res = await fetch(`${base}${path}`, { redirect: 'follow' });
    const contentType = res.headers.get('content-type') ?? '';
    const text = contentType.startsWith('image/') || contentType.startsWith('font/') ? '' : await res.text();
    const missing = needles.filter((needle) => !text.includes(needle));
    const pass = res.status === wantStatus && missing.length === 0;
    if (!pass) failed++;
    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${path} [${res.status}, want ${wantStatus}]${missing.length ? ` missing: ${missing.join(', ')}` : ''}`
    );
  } catch (err) {
    failed++;
    console.log(`FAIL ${path} — ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(failed === 0 ? '\nAll smoke checks passed.' : `\n${failed} smoke check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
