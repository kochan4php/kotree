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
| `guestbook` | message, hashed IP, user-agent, reactions, `pinned` | hashed IP is truncated SHA-256; a post that scores as spam is stored `hidden` with its reading (ADR 0006) |
| `reactions` | per-path, per-kind totals | one row per page, no identifiers (G1) |
| `uptime_beats` | `day`, `beats`, `lastMs` | written only when Mongo answered, so a gap is a quiet day, not an outage (ADR 0005) |
| `client_errors` | message, source, url, stack | fed by `/api/log`, CSP reports and the window error handler |
| `audit` | event, detail, hashed IP | admin actions |
| `boss_scores`, `rate_limits`, `vitals` … | gameplay and telemetry | `rate_limits` rows self-expire |

Rate limiting is MongoDB-backed (`consumeRateHit`), keyed by IP or IP+route,
windowed per minute. Buckets are short-lived by TTL. Every operation carries a
`maxTimeMS` guard (M25), and the indexes in `ensureIndexes()` mirror the query
shapes the app actually runs — `node scripts/audit-indexes.mjs` rebuilds them
in a scratch database and explains every hot query, failing on a COLLSCAN that
no TTL bound justifies.

## Content, feeds and structured data

Markdown content is parsed by `src/lib/markdown-parse.ts` (headings, paragraphs,
quotes, lists, GFM tables, `> [!NOTE]` callouts, `[^1]` footnotes, fenced code)
and rendered by `src/lib/markdown.tsx`. The parser is split from the renderer so
`node --test` covers it without JSX. Headings get stable ids, a copy-link button
and a named view-timeline; the table of contents follows the reading position
with `animation-timeline: view()` — no scroll listeners, gated on `@supports`.
Links pass through `safeHref`: only `http`, `https`, `mailto` and site-relative
URLs become anchors and anything else is rendered as plain text, so a hostile
scheme in content can never become a clickable hole.

New notes are scaffolded with `pnpm new:note <slug>` (I7), which writes the dated
filename and the frontmatter the build expects.

Feeds are built once at build time (`force-static`): `/rss.xml` (full content in
`<content:encoded>`), `/feed.json` (JSON Feed 1.1 with `content_html` and
`date_modified`), and `/notes/tags/[tag]/feed.xml` per tag. Every response
carries an ETag and a Last-Modified taken from its newest item.

`/sitemap.xml` is an index over four hand-built sub-sitemaps
(pages/notes/projects/tags); notes and projects carry `<image:image>` entries
pointing at their share cards. `scripts/gen-og.mjs` renders every share card at
build time and writes `public/og/manifest.json`, which the `/og` gallery reads.

Structured data: the layout carries one Person + WebSite graph; pages add
BlogPosting (notes), CreativeWork/WebApplication (projects — `kind: app` in
frontmatter), CollectionPage (tag pages) and BreadcrumbList. Microformats2
classes (`h-card` on home/about, `h-entry` on note and project pages) make the
same pages readable to IndieWeb parsers.

## Effects and motion

Every ambient effect (background canvas, ghost cursor, confetti, scroll
fades, Doom, boss fight) sits behind three gates:

1. **The `fx` preference** — the "Background effects" switch in the dock panel
   starts and stops them live via the `kotree:prefs` event.
2. **Reduced motion** — `prefersReducedMotion()` in `src/lib/prefs.ts` checks
   the OS media query *and* the in-app "Reduce motion" switch (mirrored onto
   `html[data-motion]` before first paint). A CSS gate in `animations.css`
   flattens every animation and transition; the JS checks stop the loop's
   start; `animations.css` also disables the view-timeline reveals.
3. **Device hints** — `save-data` connections skip the ghost cursor, the
   background degrades to a single painted frame, and loops pause while the
   tab is hidden (`document.hidden`).

Canvas pixel ratios are capped at 2 (background, confetti, Doom) — 4K screens
at 200% scaling would otherwise render four times the pixels for no visible
gain. Game loops cancel their `requestAnimationFrame` and release the WebGL
context on unmount.

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
6. **Spam scoring** (`src/lib/spam.ts`): links, punctuation and advert phrases
   score a post; at 4 it is stored hidden with its reasons for a human, never
   refused (ADR 0006).
7. **Privacy** (`/api/privacy`): the device token the wall already uses reads and
   deletes a visitor's own guestbook rows. `DELETE` sits behind `guardOrigin`,
   `GET` behind the rate limit only — a same-origin page load sends no `Origin`
   header, and a cross-site reader cannot see the response (ADR 0007).

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
| Perf | `pnpm test:perf` | LCP/CLS/TTFB budgets, 4× CPU throttle, runs isolated (`playwright.perf.config.ts`) |
| Index audit | `node scripts/audit-indexes.mjs` | explain() on every hot query against a scratch database |
| Visual | same | baselines are Windows-only (`*-win32.png`); regenerate with `--update-snapshots` on Windows |
| Cross-browser | `npx playwright test -g @crossbrowser` | Firefox and WebKit: the Win95 desktop, keyboard help, motion gates |
| Bundle | `pnpm check:bundle` | ranked per-chunk budgets + diff against `scripts/bundle-baseline.json` |
| Smoke | `node scripts/smoke.mjs <url>` | post-deploy status/content check |
| Load | `pnpm load:check -- <url> 40` | light parallel check across five hot paths; p95 budget 2500 ms |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit, build, the index
audit, the light load check, the bundle budget and the full browser suite on
Node 22 and 24. Scheduled workflows: daily smoke against production, weekly data
backup (both activate once `SITE_URL` is set).
