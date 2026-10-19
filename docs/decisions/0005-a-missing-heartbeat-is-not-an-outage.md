# ADR 0005 — A missing heartbeat is not an outage

- **Status:** accepted
- **Date:** 2026-10-19
- **Supersedes:** —

## Context

H1 asked for an uptime signal. Kotree runs on a serverless host with no agent to
install, so the only place a beat can be written is inside the app itself — and the
only thing the app can record about Mongo is what Mongo itself just answered.

## Decision

`uptime_beats` holds one row per UTC day: `{ day, beats, lastMs, lastAt }`. Every
healthy `GET /api/health` increments today's row. Nothing writes a row when Mongo is
unreachable — a failed read cannot be recorded in the database that failed.

That gives the row one honest meaning: **somebody pinged the health route and Mongo
answered**. It does not mean "the site was up all day", and a day with no row does
not mean "the site was down". It means nobody pinged.

## Consequences

- The stats page prints that caveat next to the strips rather than leaving the reader
  to infer an outage from a gap. The tests pin the wording.
- External monitoring — the scheduled smoke workflow — is what actually establishes
  uptime; the beats are a second, in-app witness.
- A day only fills up while something is polling `/api/health`. That is the alert
  workflow's job, and it is why a quiet day stays quiet instead of turning into a
  false red.
