---
title: View transitions in practice
date: 2025-12-13
tags: css, view-transitions, performance
series: Web platform notes
seriesOrder: 2
summary: The native view transition API takes an afternoon to learn; the work is naming a few elements, respecting motion preferences and knowing where WebKit still differs.
---

The view transition API is deceptively small. You wrap a DOM change in `document.startViewTransition`, the browser takes an old snapshot, applies the change, takes a new one, and animates between them. The difficulty is choosing what deserves a name, and accepting that the effect is decoration.

## Two modes, one idea

Same-document transitions cover client-side route changes and state changes. The callback mutates the DOM; the browser handles the rest.

Cross-document transitions cover ordinary navigations. Both pages opt in with `@view-transition { navigation: auto; }`, and the browser animates between the documents. It only works for same-origin navigations.

Support is wide enough to use as an enhancement. Chromium has had both for years. Safari shipped same-document transitions in 18.0 and cross-document in 18.2. Firefox arrived late in 2025 with same-document support, so cross-document navigation is still the less even ground. Without support, the navigation simply happens, which is the correct fallback.

## Naming is the design work

The root element gets a transition automatically. Everything else needs `view-transition-name`, unique among rendered elements. A duplicate name aborts the whole transition with a console warning, a harsh way to learn that two list items share a name.

Name a handful of things: the site mark, the page title, maybe a hero image that genuinely persists between routes. Do not name every card in a grid. Each named element becomes a snapshot layer, and a long list is a memory and raster cost for an animation nobody asked for.

If items are reordered, names can be generated from a stable id, for example `card-${id}`. Keep the set small and remove names when elements are off screen. A name on a hidden or duplicated element is worse than no transition.

## Keep the callback synchronous

The callback runs between the snapshots. If it returns a promise, the browser waits and the old frame sits on screen while data loads, which looks like a frozen page. Prefetch first, then start the transition and commit synchronously.

In React, that means `flushSync` around the state update inside the callback. React batches updates, and a commit after the snapshot is captured produces a transition from the old state to itself. The API is not React-aware; the flush is the bridge.

Nested transitions throw, so guard against a second call while one is running. A boolean, or a check on the transition's `finished` promise, is enough to stop a double click producing an unhandled rejection.

## Motion is a preference, not a default

The media query is not optional:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

Shortening the duration to a millisecond is not removing the animation; the snapshots still happen and some people still notice the flash. Set `animation: none`, and skip the call when the preference is set. The in-app motion switch duplicates the rule under `[data-motion='off']`.

A transition should communicate a change the user caused. A fade on first paint is not a transition; it is a delay with styling.

## Where WebKit still differs

Snapshots are flattened images, so anything that depends on live compositing can look wrong. Fixed and sticky headers may appear twice or jump between positions. `backdrop-filter`, `filter` and `mix-blend-mode` can render differently in the old and new layers. Elements inside `overflow: hidden` can be clipped at the wrong boundary when a transform has created a containing block.

Some of this improves with each release; some is inherent to snapshotting. Test the transition in Safari, not just the endpoint. The common failures are a duplicated header, a missing shadow and a focus ring a frame late.

Back and forward navigation is inconsistent. A page restored from the back-forward cache may not run the transition at all. Focus and selection are frozen during the animation, so move focus after `transition.finished`.

## The performance bill

A transition captures pixels. A small named header is cheap; a full-page snapshot of a long document is not, particularly under CPU throttling. The animation runs on the compositor, but the capture and layout work happen on the main thread, which is what can hurt Interaction to Next Paint.

Do not start a transition on scroll or every keystroke, keep named areas small, and measure with a cold cache and a throttled CPU. A 200 ms crossfade can feel instant while adding a frame of delay to a navigation that used to be immediate.

## When not to

If the new page has a different shape, a transition can be more disorienting than a clean cut. A data table gains nothing from a crossfade. If the user asked for less motion, the answer is no motion. The API suits a few moments, not every route.

The site's route change is still a plain CSS fade: predictable, cheap and works everywhere. The native API is reserved for places where continuity means something.
