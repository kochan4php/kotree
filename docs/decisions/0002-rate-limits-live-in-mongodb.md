# ADR 0002 — Rate limits live in MongoDB

- **Status:** accepted
- **Date:** 2026-10-18
- **Supersedes:** —

## Context

Every write endpoint needs throttling (guestbook posts, votes, clicks, chat) and the
admin surface needs two budgets — reads vs writes. The site deploys to Netlify: several
serverless instances run side by side and cold-start at will, so an in-memory counter is
per-instance by construction. A determined client hits a cold instance and starts from
zero; a spiky burst across instances multiplies the limit.

## Decision

One small fixed-window bucket per key in `rate_limits`, consumed with a single atomic
`findOneAndUpdate`, cleaned up by a TTL index. Keys are prefixed per surface
(`guestbook:`, `poll-vote:`, `admin-read:`, `global:`, …). The client IP is the **last**
`X-Forwarded-For` hop — earlier hops are client-supplied and spoofable.

## Consequences

- Limits hold across instances and restarts; no extra service to run or pay for.
- The counters add one database round trip to a request that is about to write anyway.
- **Fails open**: if Mongo is unreachable, requests are allowed. Locking every visitor
  out of a still-readable site is the worse failure.
- The admin surface gets two budgets (90 reads / 30 writes per minute, same window):
  dashboard polling must never starve moderation. A 429 always carries
  `Retry-After: 60`, matching the window the buckets use.
- TTL cleanup is best-effort; a stale bucket at worst delays one request.
