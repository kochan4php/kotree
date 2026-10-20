---
title: React 19 and the external store
date: 2026-01-10
tags: react, state, typescript
series: Web platform notes
seriesOrder: 3
summary: Preferences and toasts live outside React, and useSyncExternalStore is the supported way to read them without tearing or hydration surprises.
---

Some state does not belong to a component. A toast can be raised from a fetch handler or a plain module with no React tree in sight. A theme preference has to be read before the first paint. Putting either in context means a provider at the root and a re-render of every consumer when one toast appears. A small module store is a better fit, and React has shipped the hook that reads one safely since React 18.

## The contract

`useSyncExternalStore` takes three functions: subscribe, getSnapshot and getServerSnapshot. Subscribe registers a callback and returns an unsubscribe. The snapshot is the current value. React calls the snapshot during render and re-renders when the store notifies.

```ts
const listeners = new Set<() => void>();
let snapshot = { theme: 'system', motion: 'system' };
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => snapshot;
const getServerSnapshot = () => snapshot;
```

Two rules make or break it. Define the functions outside the component; a new `subscribe` on every render forces a resubscribe. And `getSnapshot` must return a cached reference. Building an object or filtering an array inside it returns a new value each call, which React reports as "the result of getSnapshot should be cached" and can loop forever.

## Tearing, briefly

Concurrent rendering can pause in the middle of a tree. If the store changes while React is rendering, one component may read the old value and another the new one. That is tearing: a single committed UI showing two versions of state.

`useSyncExternalStore` detects a change between render and commit and restarts the render synchronously, so the committed tree is consistent. The cost is that an update can throw away work, so stores should change at human speed, not per pointer move. Copying the snapshot into `useState` in an effect brings back a stale copy; read the store in render.

## Preferences

The theme, motion, contrast and effects settings are one object in `localStorage`, with defaults for anything missing. The store reads it lazily on the client and keeps the parsed object in memory. Writes go through one function: merge, persist, notify. A failed write, in private mode or when the quota is full, still updates memory so the current tab behaves correctly, but the choice will not survive a reload.

Hydration is the trap. The server renders defaults because it cannot know the visitor's stored theme. If the client's first snapshot already contains the stored value, the markup differs and React reports a mismatch. The fix is to start on the defaults, render, then read storage in an effect and notify. That is one extra render, not a mismatch. The visual flash is handled separately by an inline script that sets `data-theme` and `data-motion` on the `<html>` element before the stylesheet paints.

The effect also listens to `storage` so one tab updates the others, and to `matchMedia` for system preferences. Both listeners are removed on teardown. A `system` value stays separate from the explicit choice, so "follow the system" keeps working when the operating system changes at dusk.

## Toasts

A toast queue is an array plus a counter. Adding a toast creates a new array, which changes the snapshot identity and wakes subscribers. Removing one filters it out. The queue caps at three.

The timer belongs in the store, not the component. If the component owns it, unmounting leaves the timer alive and remounting restarts it. The store can pause a timer while the pointer is over the stack, which helps anyone who needs longer to read.

The server snapshot is a shared empty array constant. A fresh `[]` is a new reference every call and the hook will complain; the constant is safe because changes replace the array.

Toasts are announced through an `aria-live="polite"` region with `role="status"`. It has to exist before the first toast so screen readers pick up the change.

## Where the pattern stops

External stores suit low-frequency, shared state: preferences, toasts, a feature flag, the command palette mode. They are a poor place for pointer coordinates or scroll position. Those belong in a ref and, if visible, a `requestAnimationFrame` write.

React has no selector version of the hook. Subscribing to a small store and reading the whole object is fine; the component re-renders when any field changes, which is cheap at this size. If a store grows, split it by concern rather than adding a selector and an equality function that will eventually be wrong.

The appeal is that non-React code becomes a first-class producer. A fetch wrapper can raise a toast without a hook, and a preference can be read before React exists. The hook is the bridge, not the owner.
