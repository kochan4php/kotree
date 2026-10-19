# Kotree

[![CI](https://github.com/kochan4php/kotree/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kochan4php/kotree/actions/workflows/ci.yml)
[![Node 22 | 24](https://img.shields.io/badge/node-22%20%7C%2024-5fa04e)](https://nodejs.org)
[![Bundle budget](https://img.shields.io/badge/bundle-budget%20enforced-1f6feb)](docs/runbook.md#perf-budget-failed)
[![a11y: axe AA+](https://img.shields.io/badge/a11y-axe%20AA%2B-blueviolet)](e2e/a11y.spec.ts)

A link-in-bio page for Deo Subarno (Kochan). One page, all social links, click
counters backed by MongoDB — plus a guestbook, an AI terminal, a Win95 desktop
and a boss fight hiding behind the easter eggs.

Next.js App Router, Tailwind CSS v4, MongoDB, no client-state library.

## Features

- Profile card, social links with live click counters, live totals
- Search palette (`Ctrl+K`) over links, pages and content
- Reference pages: `/uses`, `/links`, `/og`, `/explore`, `/qr`, `/status`
- Locked notes with per-note secret pages, tags and a quiz
- Secret Confessions guestbook — messages are obfuscated in the browser; the
  wall works without JavaScript via a `<noscript>` fallback
- Kotree Wrapped (`/wrapped`) — a yearly recap with links, clicks, tags and a
  Windows 95 guest mode
- Client-error reporting (with source maps kept server-side) and Core Web
  Vitals ranking, both rolling up into `/api/health` and the admin dashboard
- PWA — installable, offline shell, share target, iOS splash screens,
  background refresh
- SEO: JSON-LD, Open Graph, image sitemaps, microformats2, RSS + JSON feeds,
  one feed per tag
- WCAG AA contrast everywhere, reduced-motion support, focus management;
  enforced by axe in the e2e suite

## Stack

- Next.js 16 (App Router, Turbopack builds)
- Tailwind CSS v4
- MongoDB (driver only)
- pnpm, Node 22+

## Requirements

- Node.js 22 or 24 (CI runs both; unit tests use type stripping)
- pnpm
- MongoDB running locally (or a `MONGODB_URL` env var)

## Setup

```bash
git clone https://github.com/kochan4php/kotree.git
cd kotree

npm install -g pnpm
pnpm install

# optional: point to your MongoDB
# MONGODB_URL=mongodb://localhost:27017

pnpm dev
```

Open https://localhost:3000 (the dev server runs with HTTPS).

## Scripts

| Command               | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `pnpm dev`            | Start dev server (HTTPS)                            |
| `pnpm build`          | Production build (regenerates OG art + search index)|
| `pnpm start`          | Serve the build                                     |
| `pnpm lint`           | Run ESLint                                          |
| `pnpm typecheck`      | TypeScript check (`tsc --noEmit`)                   |
| `pnpm test:unit`      | Unit tests (Node test runner, type stripping)       |
| `pnpm test:e2e`       | Playwright e2e + axe a11y suite                     |
| `pnpm test:perf`      | Playwright perf budget suite                        |
| `pnpm check:bundle`   | Bundle-size budget against `bundle-baseline.json`   |
| `pnpm smoke`          | Smoke-test a deployed site: `pnpm smoke -- <url>`   |
| `pnpm scan:secrets`   | Fail if a secret pattern sneaks into the repo       |
| `pnpm gen:splash`     | Regenerate the iOS splash screens                   |
| `pnpm changelog:draft`| Draft a changelog skeleton from the commit log      |
| `pnpm new:note`       | Scaffold a dated note: `pnpm new:note <slug>`       |
| `pnpm load:check`     | Light load check: `pnpm load:check -- <url> <n>`    |
| `pnpm backup`         | Export MongoDB data to `backups/`                   |

`pnpm test:e2e` builds and starts the app itself; a local MongoDB is required.
CI runs lint, typecheck, unit tests, build, bundle budget and the full e2e
suite (including the axe audit) on Node 22 and 24, for every push.

## Writing

Notes live in `content/notes` as plain Markdown, named `YYYY-MM-DD-slug.md`.
Scaffold one so the frontmatter is never half-written:

```bash
pnpm new:note offline-first
```

Fill in `summary` and `tags`, write the body, then run `pnpm changelog:draft`
before committing. It groups the commits since the last tag; a human still
turns those bullets into a plain-English entry for `/changelog`.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URL` | no | `mongodb://localhost:27017` | MongoDB connection string |
| `NEXT_PUBLIC_BASE_URL` | no | `http://localhost:3000` | Canonical URL for SEO and feeds |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | – | Google Search Console token |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | no | – | Bing Webmaster token |
| `GEMINI_API_KEY` | no | – | Real AI answers in the terminal (falls back to mock) |
| `DISCORD_WEBHOOK_URL` / `TELEGRAM_WEBHOOK_URL` | no | – | Notify when a link is clicked |
| `ADMIN_TOKEN` | no | – | Unlocks `/admin`; also the HMAC key for admin sessions |
| `ADMIN_TOTP_SECRET` | no | – | Base32 TOTP secret; when set, admin login asks for a 2FA code |
| `ADMIN_TOTP_RECOVERY` | no | – | Comma-separated SHA-256 hashes of one-time recovery codes |
| `ADMIN_BIND_UA` | no | – | Set to `1` to bind admin sessions to the browser user agent |
| `CSP_ALERT_THRESHOLD` | no | `25` | CSP violations per 24h that trigger the alert workflow |
| `ERROR_ALERT_THRESHOLD` | no | `25` | Live app errors per 24h that trigger the alert workflow |
| `LCP_ALERT_MS` | no | `4000` | Slowest LCP p75 (ms) that triggers the alert workflow |

Set `NEXT_PUBLIC_BASE_URL` to your real domain before deploying. Without it,
SEO links (canonical, sitemap, Open Graph) point to localhost.

## API

- `POST /api/click-link-counter` — increments a link counter. Body: `{ "name": "github", "count": 1 }`.
- `GET /api/click-link-counter` — all link counters.
- `POST /api/guestbook` — adds a guestbook entry. Body: `{ "message": "...", "_token": "..." }`.
- `GET /api/guestbook?limit=10&before=<ISO date>` — reads entries, newest first (no IPs or user agents).
- `POST /api/guestbook/report` — reports an entry; it hides once enough reports pile up.
- `POST /api/poll` / `GET /api/poll` — vote or read the current poll.
- `POST /api/pageview`, `POST /api/log`, `POST /api/csp-report` — beacons: page views, client errors, CSP violations.
- `POST /api/chat` — AI terminal endpoint (guarded by origin + rate limit).
- `POST /api/boss-scores` / `GET /api/boss-scores` — leaderboard.
- `GET /api/reactions?path=/notes/…` / `POST /api/reactions` — per-page reactions (👍 ❤️ 🔥), counted per path.
- `GET /api/stats.json` — last 30 days, top links, busiest hours and the week-on-week change, cached for 60 s.
- `GET /api/privacy?owner=…` / `DELETE /api/privacy?owner=…` — a device token reads and deletes its own guestbook entries (see [ADR 0007](docs/decisions/0007-privacy-without-accounts.md)).
- `GET /api/badge/<clicks|wrapped>.svg` — embeddable README badges, fail-soft to “offline”.
- `GET /api/health` — uptime check (`200` when Mongo is reachable, `503` otherwise), including 24h CSP-violation count.
- Admin (Bearer `ADMIN_TOKEN` or session cookie): `GET /api/admin/overview`, `DELETE /api/admin/guestbook?id=…`, `GET /api/admin/export`, `GET /api/admin/audit`, `GET/DELETE /api/admin/sessions`, `POST /api/admin/session`.

Write endpoints reject requests that:

- come from a different origin (checked via `Origin` and `Sec-Fetch-Site`)
- send an invalid CSRF token, a malformed path, or a link name not in the list
- exceed their per-IP rate limit (last proxy hop — spoof-proof; 429 with `Retry-After`)

## Gates and budgets

Every batch must pass, in order: `lint` → `typecheck` → `test:unit` → `build`
→ `check:bundle` → `test:e2e` (chromium) → cross-browser/mobile projects →
`smoke`. The bundle budget is smaller than the committed baseline; visual
snapshots are win32-only. See `docs/runbook.md` for what to do when a gate
fails.

## Project structure

```
src/
  app/          pages, layout, metadata, API routes
  components/   UI components, one per file
  connections/  MongoDB client and queries
  data/         profile and social link data
  interfaces/   shared types
  lib/          utilities (security, rate limiting, content, feeds)
e2e/            Playwright suites (features, a11y, visual, waves)
tests/unit/     Node test-runner suites
docs/           architecture, runbook, ADRs
scripts/        build-time and ops scripts (OG art, splash, backup, drill)
```

## Documentation

- [Architecture](docs/architecture.md) — how the pieces fit, rendering model
- [Runbook](docs/runbook.md) — deploy, rollback, incidents, gates
- [Contributing](CONTRIBUTING.md) — setup, gates, content workflow
- [Decisions](docs/decisions/) — ADRs: CSP nonce, rate limits, platform-first
  builds, report-only Trusted Types, heartbeat gaps, spam holds, privacy without
  accounts
- `/changelog` — every release in plain language

## Deployment

1. Install dependencies with `pnpm install`.
2. Set env vars (see above); at minimum `MONGODB_URL`, `NEXT_PUBLIC_BASE_URL`
   and `ADMIN_TOKEN`.
3. Run `pnpm build`, then `pnpm start` — or push to `main` and let the
   configured host (Netlify) build it.
4. After it is live: `pnpm smoke -- https://<your-site>`.
