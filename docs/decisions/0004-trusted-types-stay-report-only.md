# ADR 0004 — Trusted Types stay in report-only

- **Status:** accepted
- **Date:** 2026-10-19
- **Supersedes:** —

## Context

`src/proxy.ts` sends `Content-Security-Policy-Report-Only: require-trusted-types-for 'script';
report-to default`, and violations land in the admin's error stream through `/api/csp-report`
(H3 asked whether to flip that into enforcement).

## Evidence

Seven days of the report stream, queried 2026-10-19, hold 53 `require-trusted-types-for`
violations — all of them with a document URL from this machine, every one a Trusted HTML
assignment inside our own pages, none of them an injected string. The sink is React's
`dangerouslySetInnerHTML`, which the site uses for its JSON-LD blocks (`src/app/layout.tsx`
and each page's breadcrumbs): React assigns those through `innerHTML` whatever the policy
says.

Enforcement would therefore break structured data on every route unless a policy answers for
that assignment. The only policy React can satisfy is one named `default`, which every sink
consults automatically — and a `default` policy that hands back whatever string it is given
is a rubber stamp: it turns enforcement into paperwork rather than into protection.

## Decision

Keep the policy report-only. Do not add a `default` Trusted Types policy.

Enforcement earns its keep the day the site stops handing pre-built strings to `innerHTML` —
for instance by rendering JSON-LD through a `<script>` element React fills as text. The
violation stream is the metric to watch for that.

## Consequences

- Chrome keeps reporting every sink assignment, so a genuine injection would arrive next to
  the JSON-LD noise. `getTopCspViolations` is on the admin dashboard and `cspViolations24h`
  in `/api/health` is watched by the alert workflow.
- Report-only blocks nothing by itself: today the nonce in `script-src` is what stops
  injected script.
