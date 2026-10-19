---
title: A budget for every byte
date: 2026-05-17
tags: performance, testing, vitals
summary: Every route has a raw-JavaScript ceiling checked in CI, and real visitors' p75 timings have their own shelf on the status page.
---

Performance budgets fail quietly. Nobody notices the route that gained forty kilobytes in a feature commit until a phone on a train notices for them. So Kotree states its budgets twice: once in tests that fail, and once in numbers real browsers send back.

The first half is a Playwright suite that runs against a production build, in a cold context with an empty cache and no service worker, with the CPU throttled to a quarter speed. Five routes — home, notes, projects, guestbook and stats — must paint their largest element within 2.5 seconds, keep layout shift under 0.1, and start responding within 800 milliseconds. Those ceilings double on shared CI runners, because they are about the page, not the machine.

One budget does not flex: raw JavaScript per route. The suite adds up the decoded size of every script a route needed before its load event and fails if it crosses 800 kilobytes. Bytes come from the build, not the machine, so there is no CI multiplier on this one. Raising the ceiling should be a decision, not a drift.

The second half is field data. About one visitor in ten is sampled, decided once per browser, and their browsers send Core Web Vitals samples for the page they are on — the metric, the page and the day, nothing that identifies anyone. The [status page](/status) shows the 75th percentile over the last week, per page and metric, beside a four-week trend and a rating taken from the same thresholds the field data uses.

The two halves keep each other honest. The test catches a regression on the commit that caused it. The field data catches the one the test never sees, because it was measured on a real phone, on a real network, in a real pocket.
