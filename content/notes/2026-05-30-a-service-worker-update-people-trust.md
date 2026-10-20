---
title: A service worker update people trust
date: 2026-05-30
tags: pwa, service-worker, ux
series: Building Kotree
seriesOrder: 7
summary: A waiting worker plus a visible refresh prompt is slower than skipWaiting and much less likely to lose someone's work.
---

The first version of a service worker is easy. The update is where it earns trust. A new worker installs, finds an old page still open, and waits. The page can ignore it, reload under the user, or ask. The default lifecycle already chooses the safest option; the temptation is to override it for a faster deploy.

## Why not skipWaiting by default

`self.skipWaiting()` moves the new worker from waiting to active immediately and lets it claim the open pages. That sounds clean. In practice the old page is still running old JavaScript while the new worker serves a new cache. A lazy-loaded chunk from the old build may no longer exist, or may arrive with a different hash. The page half-works until it is reloaded, which is worse than a clearly stale page.

There is also the human cost. Someone typing a guestbook message, editing a Notepad draft or halfway through a form does not want the page to reload because a deploy happened. The safe default is to let the old worker control the old page, install the new one in the background, and ask.

## Making the prompt honest

The page can detect a waiting worker in two places. On load, `navigator.serviceWorker.ready` resolves to a registration whose `waiting` property may already be set. During the session, the `updatefound` event fires, and the new worker's `state` moves to `installed`; if there is already a controller, that worker is waiting.

When that happens, show a persistent but non-blocking message: a new version is ready, with Refresh and Later. Do not use a modal for a deploy. Do not reload on a timer. If the page has unsaved state, the Refresh action should warn first, and the warning should name the state rather than saying "unsaved changes".

On accept, post `SKIP_WAITING` to the waiting worker. The worker calls `self.skipWaiting()`, activates, and the page listens for `controllerchange`. Reload once, guarded by a flag, because `controllerchange` can fire more than once in a messy update and a reload loop is a memorable bug.

```js
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  location.reload();
});
```

The prompt should also survive a reload. If the user chooses Later, the waiting worker is still there on the next visit; the page should find it again rather than pretending the update never happened.

## Cache versions and the queue

The cache name carries the build id or a version number. On activate, delete every cache that is not in the keep-list. The keep-list must include the data cache used by the offline queue, or an update becomes a data-loss event.

The HTML strategy matters too. A network-first page with a cache fallback gets the new document when online and the old one when not. A cache-first page can serve an old document that references assets the new worker has already deleted. If the app uses cache-first HTML, keep the previous build's assets for at least one release.

The worker script should be served with `Cache-Control: no-cache` so a proxy does not keep an old copy; the browser revalidates it on update anyway. Checks run on navigation and at most once every 24 hours, so a long-lived tab may need a nudge. `registration.update()` on `visibilitychange`, throttled to a few hours, is enough.

## Testing an update

The update path is hard to test because it needs two versions. A unit test can cover the cache-name and keep-list logic. An end-to-end test needs a fixture worker, or a build step that changes the version and serves the new script.

The useful assertions are behavioural: the old page still works after the new worker installs; the prompt appears; Later leaves the page alone; Refresh activates the new worker and reloads once; the old cache is gone; the queue still holds its item. A test that only checks that `sw.js` was fetched proves nothing.

It is also worth testing the failure. If the new worker's install throws, the old worker should keep controlling the page. A failed update should leave the site working, not unregister the worker in a panic.

## The edge cases

Safari does not support Background Sync, and iOS can evict a service worker after disuse. The prompt still works while the page is open, but "it will update in the background" is not a promise there. Say "refresh to update" instead.

A hard reload bypasses the worker, which is useful for debugging and confusing for support. The page should say what happened after the reload: the version, in the footer or the about panel, is enough.

Keep the old worker's caches until the new one is active. Deleting them during install leaves a window where neither version can serve the page. Activate is the right place, after the new worker is in control.
