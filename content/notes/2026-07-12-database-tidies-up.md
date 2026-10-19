---
title: A database that tidies up after itself
date: 2026-07-12
tags: mongodb, infrastructure, privacy
summary: TTL indexes delete what has expired, rate limits live in the database across instances, and the audit log keeps a hashed record.
---

MongoDB is the only state Kotree has, so it gets two rules: nothing grows forever, and every hot query has an index matching the shape it actually runs.

The first rule is mostly TTL indexes. A rate-limit bucket expires a minute or two after the window it counted. Vitals samples live for 90 days. Client errors for seven. The one-click-per-visitor claims for 35. Admin sessions and guestbook bans expire the moment their own deadline passes. The audit log keeps 180 days. None of this needs a cron job; MongoDB does the tidying.

The second rule has a script, because “we have indexes” is easy to say and hard to see. It rebuilds the app's real indexes in a scratch database, fills it with synthetic documents with the spread of a busy year, and runs `explain()` on every hot query — the guestbook's page one, the leaderboard, the audit list, the vitals window. If a query collection-scans a collection that no TTL keeps small, the script fails. That is how the guestbook got a `(pinned, createdAt)` index: the plain date index could not serve a page-1 sort that floats pinned entries to the top, and the audit said so.

Rate limiting lives in the database rather than in memory, and that is the point. An in-memory counter would reset with every cold serverless instance, making the limit decorative. Keys are an IP or an IP plus a route, the window is a minute, and a global budget covers the resources that cost money — the AI terminal — where a flood spread across many addresses would sail past per-IP limits. A database hiccup fails open: the limits exist to slow abuse, not to become the outage.

The audit log is plain: what happened, to what, when, and a hashed, truncated IP. It is the same hashing the guestbook uses for moderation — enough to correlate an afternoon, not enough to know anyone's address. The [privacy note](/privacy) says as much, and it is true in the code.

Every one of these queries also carries a server-side timeout, so a stuck query cannot hold a serverless invocation open. And the tidy-up is best-effort: if it ever fails, requests still work. The database just runs a little less neat.
