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

Never commit real values. Locally `.env.local` holds `ADMIN_TOKEN` only.

## Deploy and rollback

1. Push to `main` — GitHub Actions runs lint, typecheck, unit tests, build,
   bundle budget and the full Playwright suite (Node 22 and 24).
2. Netlify builds the same commit. When it is live:
   `node scripts/smoke.mjs https://<site>` (or just trigger the
   *Production smoke* workflow).
3. Rollback: Netlify → Deploys → pick the last good deploy → *Publish deploy*.
   Data is untouched by a rollback.

The *Weekly backup* workflow exports production data every Monday; run it by
hand from the Actions tab any time. Both scheduled workflows stay dormant
until the `SITE_URL` repository variable is set.

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
`source: csp`. Fix the offending code or extend the policy in `src/proxy.ts`;
never add `'unsafe-inline'` back to `script-src`.

**Site looks unstyled after a deploy** — usually a stale service worker.
Bump the cache name in `public/sw.js` and deploy; users get the update toast.

## Local gates (same order as CI)

```bash
pnpm lint && pnpm typecheck && pnpm test:unit
pnpm build && pnpm check:bundle
npx playwright test            # visual tests need win32 baselines
```

Unit tests run on Node 24 (`node --test` with type stripping). Visual
baselines are generated on Windows only — see `docs/architecture.md`.
