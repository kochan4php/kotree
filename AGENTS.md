# AGENTS.md

Kotree is a Next.js 16 link-in-bio (neobrutalist UI, MongoDB for the interactive
bits). The conventions an agent cannot read off the code:

## Gates

Every change goes through, in this order: `pnpm lint`, `pnpm typecheck`,
`pnpm test:unit`, `pnpm build`, the affected e2e specs, `pnpm check:bundle` if the
client bundle changed, `pnpm smoke -- <url>`, then commit and push. Chain commands
with `set -o pipefail`: `pnpm lint | tail` swallows the exit code and the chain
sails on against a broken build.

## Conventions

- **No new dependencies** (ADR 0003). The toolbox is the Web Platform, CSS,
  Next.js/Node built-ins and what is already installed.
- **British English, plain words** in `CHANGELOG.md`, docs, UI copy and commit
  bodies. `/changelog` renders `CHANGELOG.md`; draft with `pnpm changelog:draft`,
  then a human rewrites the bullets into sentences.
- **The look stays**: neobrutalist, contrast never below WCAG AA in the light
  palette, ambient effects behind the `fx` preference, behind
  `prefersReducedMotion()`, and skipped on `save-data`.
- **An ADR per non-obvious trade** in `docs/decisions/` (copy the shape of 0004),
  plus a line in `docs/architecture.md` when the map changes.
- **New notes**: `pnpm new:note <slug>`, then fill in `summary` and `tags`.

## Testing

- Visual baselines are Windows-only (`e2e/visual.spec.ts-snapshots/*-win32.png`).
  Inspect the diff, then regenerate with `--update-snapshots` on Windows; never in
  Linux CI.
- `e2e/visual.spec.ts` freezes the clock and mocks the guestbook, poll, click
  counters and reactions. Pages rendered straight from live Mongo counters stay
  out of the visual suite — their baselines would be unstable by construction.
- Requests to guarded APIs need `{ origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' }`;
  `/api/csp-report` is the deliberate exception.
- `POST /api/admin/session` answers 403 without an origin (CSRF first); signed-out
  calls to authenticated admin routes answer 401.
- The admin login rate limit is 20/min/IP in Mongo and shared across the whole
  suite — keep deliberate failed logins to a minimum.
- Known flakes, re-run rather than "fix": admin CSV export, drag/timing specs,
  the Firefox axe 30-second timeout.

## Gotchas

- `react-hooks/set-state-in-effect` rejects `setState` inside effects. The house
  fix is an `eslint-disable-next-line` with a stated reason, or avoiding the state
  altogether.
- Adding a link to the footer churns all visual baselines; ask before doing it.
- Smoke tests and load checks want a built server (`pnpm build && pnpm start`),
  not `pnpm dev`.
- `src/connections/mongodb.ts` is the only place that touches Mongo; a new query
  shape belongs there with an index in `ensureIndexes()`, and
  `node scripts/audit-indexes.mjs` proves it is used.
