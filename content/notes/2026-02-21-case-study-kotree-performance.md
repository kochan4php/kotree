---
title: Case study: making Kotree fast
date: 2026-02-21
tags: case-study, performance, next.js
series: Building Kotree
seriesOrder: 1
summary: A bundle diet, smaller hydration boundaries and a CI budget hold the home route at 663 kB of JavaScript and a 948 ms largest paint.
---

Kotree started as a link list and grew into a playground. The links stayed fast because they were static; everything added around them did not. This is the account of what was slow, what was cut, and what the local measurements said afterwards. The numbers are lab numbers from one Windows machine, not field data.

## The starting point

The measurement method mattered as much as the result. Each run used a production build, a fresh browser context with an empty cache, the service worker unregistered, and the CPU throttled to a quarter speed through the Chrome DevTools Protocol. The largest paint was read from a buffered `PerformanceObserver`, and each figure is the median of five runs. The bundle figures came from the build output, counting decoded JavaScript, not compressed transfer size.

On that method, the home route shipped 663 kB of initial JavaScript and painted its largest element at 948 ms. The full build contained 1,563 kB of JavaScript across every route and lazy chunk. Neither number is catastrophic on a desktop, and both are heavy for a page whose main job is showing a name and a list of links.

The budgets already existed in spirit: a largest paint under 2.5 seconds, a layout shift under 0.1, and a response within 800 milliseconds. The byte budget was the one that did not flex, because bytes come from the build rather than the machine. It was set at 800 kB per route, and the home page was close enough to it that one more feature would have crossed it.

## Where the bytes were

The route-level bundle was the first useful view. A script summed each route's scripts from the build manifest and printed the decoded size. The offenders were not mysterious:

- The Windows 95 desktop and its four apps were in the initial graph, even though the desktop is an easter egg behind a secret.
- A charting component used on the stats page was imported by a shared module, so its cost leaked into routes that never drew a chart.
- The command palette was mounted on every page and loaded its fuzzy-search and dialog code before anyone pressed the shortcut.
- Several small client components imported the same utility barrel, which defeated tree-shaking and pulled in code for features that were not on screen.
- The font was loaded at three weights, and the heading that won the largest paint was waiting for all of them.

The total was a collection of reasonable local decisions. Nobody adds 663 kB in one commit; it arrives forty kilobytes at a time, each with a plausible reason.

## The cuts

The desktop became a dynamic import, loaded only when the secret opens. The apps inside it were already separate components, so they moved with it into a chunk that loads on demand. That one change removed the largest single block from the initial graph.

The charts moved behind the stats route's own boundary. A shared module no longer re-exported them, which also fixed the barrel file. The command palette stayed mounted for the keyboard shortcut, but its dialog, search and result rendering load on first open. The shortcut handler is a few hundred bytes; the palette is not.

The utility barrel was replaced with direct imports. This is unglamorous and easy to postpone, and it is usually worth more than a new abstraction. A barrel that re-exports everything is a promise that every consumer pays for every export.

The font went from three files to one variable file, subset to Latin, preloaded once. The fallback was adjusted with `size-adjust` and the vertical overrides so the heading did not move when the real face arrived. That work belongs to the largest paint, not to a separate typography project.

## Hydration is not just download

The second cost was hydration. A page can download little and still feel slow if the main thread spends a second attaching listeners to markup that did not need them.

The fix was boundary placement rather than a new state library. The page is a server component by default. The interactive parts are small islands: the theme switch, the guestbook form, the click counters, the command palette trigger. A provider that used to wrap the whole page now wraps only the components that read it. The Win95 desktop is not hydrated at all until it is imported.

This is the part that is hard to see in a bundle report. A component can be small and still cost a lot if it forces a large subtree to become client code. Moving one `useState` to the leaf is often worth more than deleting a dependency.

## Budgets that fail

The byte check runs after the build and sums the decoded scripts each route needs before its load event. It fails above 700 kB. There is no CI multiplier because the number does not depend on the runner.

The timing checks run in Playwright against a production build with the CPU throttled. Largest paint must stay under 2.5 seconds, layout shift under 0.1, and the response proxy under 800 milliseconds. On shared CI runners those time ceilings double, because the runner is not the page. The byte ceiling does not.

The budget is not a target to spend. It is a tripwire. When a feature crosses it, the conversation is about what to remove, not about raising the number in the same commit.

## The result

The current build ships 663 kB of initial JavaScript on the home route and 1,563 kB across every route and lazy chunk. The largest paint on the same machine and method is 948 ms, with a response proxy time well under the 800 ms ceiling. Those are local numbers from a quarter-speed CPU. They are useful for comparing builds and useless as a claim about visitors. The sampled field data is separate, and at the sample size this site has, it is not stable enough to quote as an outcome.

The result is not a finished win; it is a baseline with a tripwire around it. The remaining weight is mostly the framework runtime and the interactive shell. Removing either would cost more than it saves.

## What I would do differently

The first attempt lazy-loaded the palette trigger as well, which meant the keyboard shortcut did nothing until a chunk arrived. That is a bad trade: the shell of an interaction should be present, even if the expensive part is not. The second attempt kept the trigger and deferred the rest.

The other lesson is that a bundle budget needs a route-level view. A total is easy to report and hard to act on. The route is where a person waits.
