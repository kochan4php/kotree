---
title: Fonts and the largest paint
date: 2026-05-02
tags: performance, fonts, core-web-vitals
series: Web platform notes
seriesOrder: 7
summary: A font can delay the largest paint or shift the page after it; one preloaded subset and a matched fallback solve most of it.
---

Fonts are a strange performance topic because the expensive part is usually invisible in the network panel. A 200-kilobyte family downloads once, caches, and costs nothing on the next page. The bill arrives on the first visit, as text that appears late or moves after it appears.

## What LCP is measuring

Largest Contentful Paint is the time the largest text block or image within the viewport is painted. If the largest element is a heading, the font matters. If it is a hero image, the font is irrelevant to LCP, though it can still cause layout shift elsewhere.

Check before optimising. A PerformanceObserver with `buffered: true` reports the LCP entry and its `element`. On the home page it was the heading, so the font work was part of the LCP work.

`font-display` decides what happens while the file loads. `block` hides the text for up to three seconds, which can push the largest paint out by the same amount. `swap` paints the fallback immediately and swaps when the font arrives, which protects LCP but can move the layout. `optional` avoids the swap entirely if the font is not ready quickly, at the cost of showing the fallback for that visit. None of these is universally right; the choice depends on whether the text is the design or the content.

## One file, preloaded

The first rule is to preload only the font that the first screen actually uses. A preload hint is a high-priority request that competes with the stylesheet and the LCP image. Preloading four weights because the design might use them is a way to make the first paint slower.

A variable font collapses several weights into one file. A Latin subset removes glyphs most English pages never render. Together they can take a 200-kilobyte family under 30 kilobytes. Check the licence; most open fonts allow subsetting, and the licence should travel with the file.

```html
<link rel="preload" href="/fonts/site-latin.woff2" as="font" type="font/woff2" crossorigin>
```

The `crossorigin` attribute is required even when the font is served from the same origin, because fonts are fetched in CORS mode. Without it the browser downloads the file twice and the console warns about an unused preload.

Self-hosting removes the third-party connection and the privacy question. It also means the font is covered by the same cache headers as the rest of the build. Next.js can do the preload and the fallback metrics through `next/font/local`, which is one less hand-written hint.

## Match the fallback

The layout shift comes from the difference between the fallback and the real font: different x-height, different ascent, different line height. CSS can adjust the fallback's metrics so the swap moves almost nothing.

`size-adjust` scales the glyphs. `ascent-override`, `descent-override` and `line-gap-override` change the vertical metrics. The numbers come from the font files, and a fallback face can be generated per family. The aim is a line box that does not jump, not a perfect match.

This matters more on a slow connection than a fast one, because the fallback is visible for longer. It also matters for the heading that is the LCP element: a swap that changes the line count can move the largest text and produce a new LCP time.

## Measuring under throttling

A font test on a fast desktop with a warm cache measures nothing. Use a cold context, disable the service worker, and throttle the CPU. In Playwright, the Chrome DevTools Protocol exposes `Emulation.setCPUThrottlingRate`; a rate of 4 is a reasonable stand-in for a mid-range phone. Network throttling is separate and should be set to something honest, such as Fast 3G, rather than left unthrottled.

Then measure the same way every time: navigate, wait for the load event plus a short settle, read the buffered LCP entries, and take the median of five runs. Record the element, not just the number, because a change to the layout can change which element wins.

Lab numbers are not field data. They compare two builds on the same machine and mislead when quoted as a user experience. The sampled field data on the status page is the other half of the picture.

## What changed here

The site had a single display face loaded at three weights, no preload, and a fallback with different vertical metrics. The subset and the variable file replaced three requests with one. The preload pointed at the file the heading used. The fallback was adjusted until the heading's line box barely moved.

In a local cold-cache run at 4× CPU, the heading's paint moved from about 1.1 seconds to about 0.7 seconds, and the layout shift around the swap dropped below 0.01. Those are lab numbers on one machine, not a promise about a phone on a train.

The advice is unglamorous: fewer files, smaller files, one preload, a fallback that fits, and a measurement that does not flatter the machine.
