# Architecture

Kotree is a personal link-in-bio built on Next.js (App Router) and deployed to
Netlify, with MongoDB Atlas for the interactive bits. This file is the map.

## Rendering model

Pages are React Server Components rendered per request. That is not an
accident: the Content Security Policy uses a per-response nonce (K54) and the
root layout reads it from `x-nonce`, which opts routes into dynamic rendering.
The trade is deliberate — no `'unsafe-inline'` for scripts in production — and
the site is small enough that a function render is cheap.

Files read at request time (`content/**`, `CHANGELOG.md`) ship with the
serverless function via `outputFileTracingIncludes` in `next.config.mjs`.

Cache Components (`cacheComponents`, the successor of PPR) was evaluated and
rejected for this reason — a cached shell cannot carry a per-request nonce;
see `docs/decisions/0001`. The cost is paid back with Suspense streaming on
the Mongo-backed pages (`/stats`, `/wrapped`) and a perf budget suite
(`e2e/perf.spec.ts`, `pnpm test:perf`) that gates LCP/CLS/TTFB in CI.

Navigation hints follow the same economics: the speculation rules prerender
only the cheap content pages, and only on hover (`moderate`). `/stats`,
`/wrapped` and `/admin` are excluded because prerendering them would burn a
function render and a Mongo read per hover — `e2e/navigation.spec.ts` guards
the list.

## Map

```
src/
  app/            routes; each page exports metadata + JSON-LD
    api/          route handlers (admin, guestbook, log, vitals, csp-report …)
  components/     UI, grouped by area (layout, guestbook, pwa, effects, ui …)
  connections/    MongoDB access — every query lives here
  lib/            pure modules: security, rate-limit, prefs, content, vitals …
  data/           static content (social links, projects fallback)
  proxy.ts        the app proxy: CSP nonce, probe trap (was middleware.ts)
public/
  sw.js           service worker (see below)
scripts/          build-time and CLI helpers (og images, search index, smoke,
                  backups, bundle budget)
content/          markdown notes and projects
```

## Data model (`kotreedb`)

| Collection | Holds | Notes |
| --- | --- | --- |
| `link_counter` | per-link click totals | no identifiers |
| `page_views` | `day`, `path`, `count` | aggregates only, no IP |
| `guestbook` | message, hashed IP, user-agent, reactions, `pinned` | hashed IP is truncated SHA-256 |
| `client_errors` | message, source, url, stack | fed by `/api/log`, CSP reports and the window error handler |
| `audit` | event, detail, hashed IP | admin actions |
| `boss_scores`, `rate_limits`, `vitals` … | gameplay and telemetry | `rate_limits` rows self-expire |

Rate limiting is MongoDB-backed (`consumeRateHit`), keyed by IP or IP+route,
windowed per minute. Buckets are short-lived by TTL.

## Security layers

1. **Headers** (`next.config.mjs`): nosniff, frame-DENY, referrer policy,
   permissions policy, COOP, CORP; HSTS only on HTTPS deployments.
2. **Proxy** (`src/proxy.ts`): per-response CSP with a nonce and
   `'strict-dynamic'`, `report-uri /api/csp-report`; probe paths get 404,
   a best-effort per-instance rate limit and a log entry.
3. **Origin checks** (`guardOrigin`): every state-changing public API route
   rejects cross-origin callers before reading the body.
4. **Admin** (`guardAdmin`): bearer token or a signed 12-hour session cookie
   (`exp.hmac`, keyed by `ADMIN_TOKEN`, `timingSafeEqual` on every compare);
   mutations also require the CSRF double-submit pair. Login rotates the
   session and its token.
5. **Input** (guestbook): honeypot, CSRF token, rate limit, control-character
   strip, NFC normalise, 100-char cap, server-side.

## Service worker

`public/sw.js` precaches the shell and keeps API responses live (only the
click counter is cached). It never calls `skipWaiting()` — a new build parks
in the waiting state and `pwa-register.tsx` offers the Refresh toast, so open
tabs are not swapped underneath the reader.

## Testing

| Layer | Command | Notes |
| --- | --- | --- |
| Unit | `pnpm test:unit` | `node --test`, pure TS modules, no runner dependency |
| E2E | `npx playwright test` | chromium by default; `@crossbrowser` runs on Firefox/WebKit, `@mobile` on Pixel 7 / iPhone 13 viewports |
| Visual | same | baselines are Windows-only (`*-win32.png`); regenerate with `--update-snapshots` on Windows |
| Bundle | `pnpm check:bundle` | ranked per-chunk budgets + diff against `scripts/bundle-baseline.json` |
| Smoke | `node scripts/smoke.mjs <url>` | post-deploy status/content check |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit, build, bundle and
the full browser suite on Node 22 and 24. Scheduled workflows: daily smoke
against production, weekly data backup (both activate once `SITE_URL` is set).
