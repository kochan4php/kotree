---
title: MongoDB indexes that earn their keep
date: 2026-02-07
tags: mongodb, performance, testing
series: Web platform notes
seriesOrder: 4
summary: The equality-sort-range rule explains most compound indexes; an audit script that runs the real query shapes explains the rest.
---

An index is a promise about how a collection will be read. Every promise costs something on every write, so the goal is not many indexes. It is a collection where each hot query has one and nobody has to guess which.

## Start with the query

Write down the filter, the sort and the projection before opening the shell. The index follows from those three, not from the fields that look important. A single-field index on `createdAt` suits a plain reverse-chronological list. It does not suit a list that floats pinned entries to the top, because the filter on `pinned` and the sort on `createdAt` are two different jobs.

The guestbook's page one runs `{ pinned: true }`, sorted by `createdAt` descending, with a limit. The index is `{ pinned: 1, createdAt: -1 }`. The old `{ createdAt: -1 }` index could sort, but it examined every recent document and discarded the unpinned ones. After a year of posts, that is the page load.

## Equality, sort, range

The useful rule is ESR: equality fields first, then the sort, then the range. MongoDB can use an index prefix for equality, keep the matching rows in index order for the sort, and apply a range bound to what remains. Put the range before the sort and the index can no longer return sorted rows directly.

An index also has a direction. MongoDB can scan backwards, reversing every key at once. `{ pinned: 1, createdAt: -1 }` serves a descending sort for a fixed `pinned`; it does not serve a mixed sort unless the index matches that pattern or is exactly reversed.

Only one range field gets efficient bounds. If a query ranges over both `createdAt` and `score`, the index can bound one and filter the other after the fetch. That is often fine, but it should be a decision rather than a surprise in the explain output.

## Reading the explain plan

`explain('executionStats')` runs the query and reports the work. Look at four things:

- The winning stage. `IXSCAN` is the goal; `COLLSCAN` on a collection that is not tiny is a failure.
- `totalKeysExamined` against `nReturned`. A ratio near one means the index is selective. Hundreds means it scans a lot to return a little.
- `totalDocsExamined` against `nReturned`. Fetching documents costs more than reading keys; a covered projection can make this zero.
- A `SORT` stage. If it appears, the index did not satisfy the sort and MongoDB is sorting in memory, with a limit before it spills to disk.

`queryPlanner` mode is cheaper and shows rejected plans, which helps when the optimizer picks something unexpected. `hint()` is useful for an A/B comparison, but not as a permanent fix; the optimizer usually knows more about the data than the person writing the hint.

Small collections lie: a collection scan is fast and may be chosen. Test with a year of dates and a realistic mix.

## An audit that runs in CI

The index list drifts: a query is added in one branch, the index lands in another file, and six months later production has an index nobody remembers.

The audit rebuilds declared indexes in a scratch database, seeds documents, and runs each hot query through `explain()`. It fails on a collection scan for a collection not kept small by a TTL, on a sort stage the index should have handled, or on a ratio of keys examined to rows returned above a threshold. It also compares the declared list with the collection, so an index that exists only in an old migration is reported rather than trusted.

`$indexStats` shows which indexes have been used since the last restart. It needs real traffic and resets with the server, so it is operational rather than a test.

## TTL is an index with a job

A TTL index is a single-field index on a `Date` (or an array of dates) with `expireAfterSeconds`. A background thread wakes roughly every minute and deletes expired documents. It is not a scheduler and not precise: a document can live a minute or two past its deadline, and a busy primary can lag further.

That suits rate-limit buckets, sessions, vitals samples and bans. It does not suit anything a user expects to keep. TTL deletes are real deletes, with no undo. The field must be a real `Date`, not an ISO string; a string index never expires anything.

Compound TTL indexes do not exist. If expiry depends on two fields, store a computed `expiresAt` date and index that. Changing the expiry later is a `collMod`, not a deployment. Every TTL index still costs writes and memory, so one per collection is usually enough.

The point is not a perfect index, but a collection where the hot paths are known, expensive scans are caught before a user feels them, and the indexes that remain are doing work.
