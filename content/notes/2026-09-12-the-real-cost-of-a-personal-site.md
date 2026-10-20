---
title: The real cost of a personal site
date: 2026-09-12
tags: operations, privacy, writing
series: Web platform notes
seriesOrder: 9
summary: The bill is small and the maintenance is not; the useful skill is deciding which features deserve a pager.
---

A personal site looks cheap because the visible costs are small. A domain is about twelve pounds a year. Hosting on a free tier is zero. A small MongoDB cluster is zero. The number that matters is not on the invoice; it is the hours spent keeping the thing alive, and the attention spent worrying about it.

## Money, roughly

The domain is the only unavoidable recurring cost. TLS is free. A static site can be hosted for nothing on several platforms, and a serverless function or two usually fits inside the free allowance. A database with a few thousand documents fits in a free tier with room to spare.

The costs that surprise people are attached to features: a search service, an email provider, an AI key, a queue. Each has a dashboard, a bill and a failure mode. The cheapest architecture has the fewest vendors.

The domain is also an identity. Changing it breaks links, feeds and passwords. Pick one and keep it; redirects are never as complete as they look.

## Time, honestly

A dependency update is fifteen minutes until it is not. A major framework upgrade is a day, then a week of small regressions. A browser update can change a layout or a test baseline. A certificate renewal is automatic until the automation breaks.

The maintenance that actually matters is smaller and more regular: checking the error log, reading the uptime alert, restoring a backup once a quarter, and writing something. The last one is the point of the site and the first thing to disappear when the plumbing takes over.

A useful rule is that every feature should have an owner, and on a personal site the owner is always you. If a feature cannot survive two weeks of neglect, it needs a kill switch or it should not ship.

## Backups and restores

The database is the only irreplaceable part. The content is in git, the code is in git, and the configuration is mostly reproducible. The guestbook, the click counts and the audit log are not.

Take a logical backup on a schedule, encrypt it, and store it somewhere that is not the same provider. Test the restore before trusting it. A backup that has never been restored is a file with a hopeful name.

The free tier of a hosted database may not include continuous backups. That is fine for a personal site, as long as the export is deliberate and the restore path is written down. The same applies to environment variables: keep an encrypted copy, not a screenshot in a notes app.

## Analytics without tracking

The useful numbers are small: which pages are read, which links are clicked, whether the site is fast. None of that requires a third-party script, a cookie banner or a user identifier.

Server-side page views can be counted per day and per path, with no IP stored. Click counts can be incremented on the redirect. Core Web Vitals can be sampled and aggregated. The stats page can show totals and trends without pretending to know who anyone is.

The limitation is real: no unique visitors across days, no funnels, no attribution. A personal site does not need them. If the question is "is anyone reading the notes?", a daily count answers it. If the question is "which campaign converted?", the site has become a business and should be measured like one, with the consent and plumbing that implies.

## Deciding what not to build

The most expensive features are the ones with a social surface. Comments need moderation. Accounts need password resets and support. A public API needs keys and abuse handling. A webmention endpoint needs verification and a queue. Each is a reasonable thing to build, and each adds a place where something can go wrong at 2 a.m.

The alternative is not to build nothing. It is to build the smallest version that answers the actual need: a guestbook instead of comments, a static search index instead of a search service, a manual list of mentions instead of a receiver, a tip jar instead of a checkout.

Every one of those choices has a cost too, usually a limitation the user can see. The trade is worth making explicit in the privacy note or the colophon, so the next person, including future you, knows why the site is small.

## The number to watch

The site is cheap in money and expensive in attention. The useful metric is not the monthly bill; it is how many days go by without thinking about it. A site that runs for a month unnoticed, then welcomes you back with a working build and a readable error log, is doing its job.

That is the real cost: not the hosting, but the decision to keep the surface small enough to maintain.
