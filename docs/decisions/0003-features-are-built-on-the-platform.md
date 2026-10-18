# ADR 0003 — New features are built on the platform, not on packages

- **Status:** accepted
- **Date:** 2026-10-18
- **Supersedes:** —

## Context

The site advertises itself with numbers: bundle budget, transfer total, a11y audit,
dependency audit. Every runtime dependency is someone else's release cadence, their
transitive tree, their advisories — and it lands in a bundle that a visitor pays for on
a phone. Meanwhile the platform keeps shipping the primitives these packages wrap.

## Decision

A feature adds **no new runtime dependency** unless the platform genuinely cannot do the
job. What that has produced in practice:

- TOTP 2FA: `crypto.subtle` HMAC-SHA-1, ~80 lines (RFC 6238).
- CSV export: a quoting function; RFC 4180 is a page long.
- Secret scanning: a regex list, not a scanner service.
- iOS splash screens: Playwright screenshots, not an image pipeline.
- Theme, motion, haptics, counters, fuzzy search, the terminal: localStorage, CSS media
  queries, `navigator.vibrate`, our own Mongo counters, a 100-line scorer.
- Relative time, markdown-lite, slugify: written because the pure functions are smaller
  than the dependency's README.

Existing dependencies are kept **current and pinned** — that is a different decision from
adding new ones; `pnpm audit --audit-level high` fails CI, and majors are reviewed monthly.

## Consequences

- Bundle stays inside its budget (checked per batch against a committed baseline).
- No supply-chain surface added by features; fewer upgrades to chase.
- The code is ours to debug — the trade is real, paid once per feature; documented in
  the PR text and the `shortcut:` comments where limits exist.
- Hard rule: accessibility, security and correctness are never traded for this. If the
  platform cannot do it safely, the feature gets cut or reshaped (see ADR 0001's
  "revisit only if" clauses for the pattern).
