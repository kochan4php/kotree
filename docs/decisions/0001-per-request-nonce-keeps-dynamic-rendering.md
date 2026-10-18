# ADR 0001 — Per-request nonce CSP keeps every route dynamic

- **Status:** accepted
- **Date:** 2026-10-18
- **Supersedes:** —

## Context

K54 moved the CSP from static headers into `src/proxy.ts` so every response carries its own
nonce; the root layout reads `x-nonce` and stamps it on the inline scripts it owns (theme
bootstrap, speculation rules, JSON-LD). M2 asked whether Next's Cache Components
(`cacheComponents: true`, the successor of PPR) could restore a static shell around the
dynamic data instead.

## Decision

Keep dynamic rendering. Do **not** enable `cacheComponents`.

## Evidence

A build with `cacheComponents: true` + `partialPrefetching: true` — after temporarily
removing every `dynamic` / `dynamicParams` / `revalidate` route config — fails hard: every
route, including `/_not-found`, exits with

> Next.js encountered uncached or runtime data during prerendering. `fetch(...)`, `cookies()`,
> `headers()`, … accessed outside of `<Suspense>` prevents the route from being prerendered

The offending `headers()` read is the nonce in the **root layout**, i.e. inside the shell by
design: the theme bootstrap script must run before first paint, so it cannot sit behind a
Suspense boundary. A cached shell cannot carry a per-request nonce.

## Consequences

- Pages render per request — the documented cost accepted in K54.
- Compensated by Suspense streaming (M3) and the perf budget suite (M1).
- Revisit only if Next gains per-request nonce substitution inside cached shells.
