# ADR 0006 — Spam is held for review, not refused

- **Status:** accepted
- **Date:** 2026-10-19
- **Supersedes:** —

## Context

The guestbook needed a defence against link-farm posts. The obvious build — block
anything that looks like an advert — puts a score in charge of telling a person from
a robot, and scores are wrong sometimes.

## Decision

`src/lib/spam.ts` scores a message (links, repeated punctuation, known advert
phrases) and returns the reasons with it. At or above `SPAM_HOLD_SCORE = 4` the post
is **stored hidden** instead of rejected: `hidden: true` plus the reading, so the
admin queue can show *"held: spam 5 — three links, one phrase"* and a human decides.

Every reading is displayed, never just the number, so a false positive is one click
away from being published rather than lost. The wall tells the author their message
is queued for review, and drops the optimistic copy — no silent disappearance.

## Consequences

- No visitor's message can be destroyed by a regex. The cost is that a determined
  spammer can still fill the queue; the queue is the answer to that, not a higher
  wall.
- The scorer is pure and deterministic, so `tests/unit/spam.test.ts` pins exact
  scores and the routes can be exercised without Mongo heuristics.
- The threshold is the single dial. Raising it in `spam.ts` moves the hold point for
  the API and the queue together.
