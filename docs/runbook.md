# Kotree runbook

Everything an operator needs when something breaks, moves or leaks. Written
for the deployed site (Netlify + MongoDB Atlas); the commands are the same
ones the CI runs.

## Production topology

| Piece | Where | Notes |
| --- | --- | --- |
| Site | Netlify (Next.js runtime, `@netlify/plugin-nextjs`) | builds with `pnpm build` from `main` |
| Data | MongoDB Atlas, database `kotreedb` | connection string in `MONGODB_URL` |
| Edge | `netlify.toml` → `chat-guard` edge function on `/api/chat` | unchanged by the app proxy |
| App proxy | `src/proxy.ts` | CSP nonce, probe trap, probe rate limit |

## Environment variables

| Name | Required | What it does |
| --- | --- | --- |
| `ADMIN_TOKEN` | yes | `/admin` login token; also the HMAC key for admin sessions and the CSRF secret fallback |
| `MONGODB_URL` | yes (prod) | Atlas connection string; defaults to `mongodb://localhost:27017` locally |
| `NEXT_PUBLIC_BASE_URL` | yes (prod) | canonical URL; used for metadata, feeds and the CSRF secret |
| `COMMIT_REF` | Netlify sets it | shown on `/status` |
| `NETLIFY` | Netlify sets it | gates HSTS + `upgrade-insecure-requests` to HTTPS deployments |
| `ADMIN_TOTP_SECRET` | no | base32 TOTP secret; when set, login also asks for a 2FA code |
| `ADMIN_TOTP_RECOVERY` | no | comma-separated sha256 hashes of one-time recovery codes |
| `ADMIN_BIND_UA` | no | `1` binds admin sessions to the browser user agent |
| `CSP_ALERT_THRESHOLD` | no | CSP violations/24h that open the alert issue (default 25) |
| `ERROR_ALERT_THRESHOLD` | no | live app errors/24h that open the alert issue (default 25) |
| `LCP_ALERT_MS` | no | slowest LCP p75 that opens the alert issue (default 4000 ms) |

Never commit real values. Locally `.env.local` holds `ADMIN_TOKEN` only.

## Deploy and rollback

1. Push to `main` — GitHub Actions runs lint, typecheck, unit tests, build, the
   index audit, a light load check, the bundle budget and the full Playwright
   suite (Node 22 and 24).
2. Netlify builds the same commit. When it is live:
   `node scripts/smoke.mjs https://<site>` (or just trigger the
   *Production smoke* workflow).
3. Rollback: Netlify → Deploys → pick the last good deploy → *Publish deploy*.
   Data is untouched by a rollback.

Three scheduled workflows keep watch in production; all stay dormant until
the `SITE_URL` repository variable is set, and every one can be run by hand
from the Actions tab:

- *Weekly backup* (Mondays) — exports production data as a workflow artifact.
- *Production alerts* (every 6 hours) — smoke test plus three health numbers:
  CSP violations, live app errors and the slowest LCP p75. Failures collect in
  one rolling issue instead of piling up notifications.
- *Backup restore drill* (1st of the month) — restores the newest artifact
  into an ephemeral database and verifies the counts (see below).

## Rotating `ADMIN_TOKEN`

1. Generate a new token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Netlify → Site settings → Environment variables → replace `ADMIN_TOKEN`.
3. Trigger a redeploy (the token is read per request, but the redeploy keeps
   env changes consistent across functions).
4. All existing admin sessions and cookies are invalid immediately — the HMAC
   key changed. Log in again with the new token.
5. e2e locally uses `e2e-admin-token`; that value only exists in tests.

## Restoring data

`scripts/backup-data.mjs` (`pnpm backup`) exports `link_counter` and
`guestbook` from the database it can reach (set `MONGODB_URL`) to `backups/`.
The weekly workflow instead pulls the admin JSON export over HTTPS, which
covers links, daily clicks, guestbook, client errors and page views.

Restore from a JSON backup:

```bash
mongosh "$MONGODB_URL" --eval '
  const backup = JSON.parse(cat("backups/kotree-backup-YYYY-MM-DD.json"));
  const db = db.getSiblingDB("kotreedb");
  db.guestbook.insertMany(backup.guestbook);
  db.link_counter.insertMany(backup.links);
  db.page_views.insertMany(backup.pageviews);
'
```

Restore is additive — clear the collection first if you mean to replace.
`page_views` and `link_counter` are aggregates; losing them costs statistics,
not content.

## Backup restore drill

`scripts/restore-drill.mjs` takes a backup JSON, loads it into a scratch
database (`kotreedb_restore_drill` — the live database is never touched) and
compares the counts it finds against the counts recorded in the artifact.

```bash
node scripts/restore-drill.mjs backups/kotree-backup-YYYY-MM-DD.json
```

The monthly *Backup restore drill* workflow runs exactly this against an
ephemeral Mongo, using the newest artifact from the *Weekly backup* runs. A
red drill means the backup would not restore — investigate it before you
need it for real.

## Perf budget failed

`pnpm check:bundle` compares the built client chunks against
`scripts/bundle-baseline.json` and prints a largest-first table with the diff.

1. Find where the growth is: the table names the chunks; the biggest delta
   points at the import or dependency responsible.
2. A real regression (a client component pulled into the shell, a new import
   on a shared chunk): move the work server-side or split it behind a lazy
   import. Re-run `pnpm build && pnpm check:bundle` and confirm the number.
3. If the growth is deliberate and understood, refresh the baseline in the
   same commit (`pnpm check:bundle --update-baseline`) and say why in the
   message. Never update the baseline to make a red build green.
4. `pnpm test:perf` guards runtime instead — TTFB < 800 ms, LCP < 2500 ms,
   CLS < 0.1 locally. Red there is treated the same way: find the cause, do
   not relax the budget.

## Accessibility regression

The axe audit runs in `e2e/a11y.spec.ts` on every push; `critical` and
`serious` findings fail the suite.

1. The failure names the rule, the selector and the impact.
2. Reproduce it in the browser with the same viewport and theme. In this
   codebase the usual causes are contrast pairs (a tinted card on a tinted
   background) and focus order after a dialog change.
3. Fix the component, not the test. If a rule genuinely does not apply,
   disable it at the single call site with a comment explaining why — never
   in the shared config.
4. Re-run the whole a11y project (`npx playwright test e2e/a11y.spec.ts`) —
   fixes here like to break there.

## Incident checklist

**Scanner noise (`/.env`, `/wp-login.php`, …)** — expected background
radiation. The proxy answers 404 and logs a handful before rate-limiting the
source. Review under Admin → Errors (`source: probe`). Nothing to do.

**Suspected token leak** — rotate `ADMIN_TOKEN` (above). Check Admin → Audit
(`export_json`, `pin`, `delete` events) for what the session did.

**Database down** — the public pages keep working; `/stats`, `/wrapped`,
guestbook and admin show their fail-soft states. The status page reports the
connection. Restore Atlas access, no deploy needed.

**CSP violations in the wild** — reports land in Admin → Errors with
`source: csp`, and the 24-hour count shows on `/api/health` as
`cspViolations24h`. The *Production alerts* workflow opens or comments one
rolling issue once the count passes `CSP_ALERT_THRESHOLD` (default 25);
triage there rather than in the raw feed. Then fix the offending code or
extend the policy in `src/proxy.ts`; never add `'unsafe-inline'` back to
`script-src`. `wasm-unsafe-eval` is deliberate (ADR 0001).

**App errors or a slow week** — the same workflow reads `appErrors24h` and
`worstLcpP75` from `/api/health` and raises the same issue above
`ERROR_ALERT_THRESHOLD` (default 25 unresolved client errors) or `LCP_ALERT_MS`
(default 4000 ms). Both read zero/null when Mongo is unreachable, so silence
means "nothing reported", never "definitely fine".

**Site looks unstyled after a deploy** — usually a stale service worker.
Bump the cache name in `public/sw.js` and deploy; users get the update toast.

**Index audit red in CI** — `scripts/audit-indexes.mjs` found a query shape that
collapses to a COLLSCAN with no TTL bound to justify it. Add the index in
`ensureIndexes()` (`src/connections/mongodb.ts`) instead of widening the query
timeout, and say which query in the commit message.

**Load check red in CI** — `scripts/load-check.mjs` pings five hot paths in
parallel and fails past `LOAD_P95_MS` (default 2500 ms). Reproduce with
`pnpm load:check -- <url> 40` against a built server; a value that only turns red
in CI usually means the Mongo service was still starting, so re-run before
digging.

**A visitor wants their data gone** — point them at `/privacy`: their browser
holds the token that reads and deletes their own guestbook rows (ADR 0007). The
token is per-device, so only that device's copy goes. Without the token there is
no identifier to look them up by; ask for the message text and clear it from
Admin → Guestbook.

**Spam reported as missing from the wall** — it is probably held, not lost.
Admin → Guestbook shows `held: spam N` with the reasons (`ADR 0006`). Publish it
if the score was wrong. The threshold lives in `src/lib/spam.ts`.

**Uptime strips look patchy on `/stats`** — a quiet day, not an outage: a beat is
only written when Mongo answered, so a gap means nothing polled `/api/health`
(ADR 0005). The scheduled smoke workflow is what actually establishes uptime.

## Local gates (same order as CI)

```bash
pnpm lint && pnpm typecheck && pnpm test:unit
pnpm build && pnpm check:bundle
node scripts/audit-indexes.mjs   # needs a local Mongo
pnpm start & pnpm load:check -- http://127.0.0.1:3000 40
npx playwright test            # visual tests need win32 baselines
```

Unit tests run on Node 24 (`node --test` with type stripping). Visual
baselines are generated on Windows only — see `docs/architecture.md`.
