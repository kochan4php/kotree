---
title: Offline first without a framework
date: 2025-11-15
tags: offline, service-worker, web-platform
series: Web platform notes
seriesOrder: 1
summary: A service worker, a versioned cache and an IndexedDB queue cover most of what offline needs; the rest is deciding which failure to admit to.
---

Offline-first has a reputation as a framework problem. It is mostly three decisions: what to keep, where writes wait, and what to tell the user when neither works. The web platform has an answer for each, and the answers fit in a few hundred lines.

## What gets cached

Two caches, not one. Static assets are hashed by the build, so they can be cache-first and kept for as long as that build exists. Pages are network-first with a cache fallback, because a stale page is usually better than no page, but a fresh one is better still. A small offline page is precached and served for any navigation that misses both.

Caching HTML is not enough. A cached document still references hashed `/_next/static/...` files. If those are missing, the page arrives unstyled or blank. Install fetches each precached page with `cache: 'reload'` and stores the assets its HTML references.

The cache name carries the build identifier, for example `kotree-offline-cache-v7`. On activate, every cache not in a keep-list is deleted. The queue's data cache is on that list: deleting the cache that holds unsent messages during an upgrade would be a memorable way to lose a guestbook entry.

## Writes wait in IndexedDB

Nothing that changes state goes through the service worker's fetch handler. A POST cannot be cached, and pretending otherwise produces confusing replays. Instead the page writes a record to IndexedDB and updates the UI optimistically.

A record needs more than the payload:

```js
{ id: crypto.randomUUID(), kind: 'guestbook', payload, createdAt, attempts: 0 }
```

The `id` doubles as an idempotency key. It is sent with the request and stored by the server under a unique index, so a replay after a dropped response returns the original entry instead of creating a second one. Without that, every flaky connection becomes a duplicate.

Replaying needs the CSRF token that was valid when the user pressed send. A worker cannot read the page's memory or `localStorage`, so the token sits in IndexedDB next to the queue and is refreshed whenever the page is open.

Draining is deliberately boring: take the oldest record, send it, delete it on success, increment `attempts` and stop on a 4xx that will not improve. A `navigator.locks` lock, where available, stops two tabs draining the same queue at once. Where it is not, the server's idempotency key is the backstop.

## Background sync is a bonus

`registration.sync.register('kotree-sync-queues')` lets Chromium wake the worker after the connection returns, even if the tab is closed. It is the nicest version of this feature and it is not available everywhere. Safari does not implement the Background Sync API, and a service worker on iOS can be evicted when the browser decides it has had enough.

So the queue also drains on the `online` event, on `visibilitychange`, and on the next page load. The UI should say "waiting to send", not "will send when you are back", because only one of those is a promise the platform can keep. The distinction matters when someone closes the tab and assumes the message is already delivered.

## The failure modes worth designing for

- **A cached page from an old deploy** references chunks that no longer exist. Keep the previous build's assets for a while, and do not cache HTML forever.
- **Storage is unavailable.** Private browsing, a full disk or a blocked origin can make `indexedDB.open` fail. Keep the message in the form and show the error; do not pretend it was queued.
- **The token expired.** A 401 or 403 should keep the record and ask the user to refresh, not discard their text.
- **The server is down.** Retry with a cap and a visible state. Infinite retries drain the battery and hide the problem.
- **The browser evicted the cache.** Safari clears unused site data after about seven days. A queue that lives only on the device can vanish.
- **`navigator.onLine` is wrong.** It reports an interface, not a working route. Treat a failed fetch as the signal.

## Testing it

Playwright can take the context offline, reload, submit, reload again, go online and assert that exactly one entry reached the database. The double reload proves the queue survived; the single entry proves the idempotency key worked. A second test activates a new worker and checks that the old cache is gone while the queue remains.

None of this requires Workbox. It requires being honest about the difference between "saved" and "sent", which is the whole feature.
