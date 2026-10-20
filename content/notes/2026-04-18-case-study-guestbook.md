---
title: Case study: a guestbook that survives the internet
date: 2026-04-18
tags: case-study, mongodb, security
series: Building Kotree
seriesOrder: 2
summary: An obfuscated wall, a spam score instead of a spam filter, database-backed limits and an offline queue that does not duplicate messages.
---

A guestbook is a small feature with a large attack surface. It accepts text from strangers, stores it, shows it to other strangers and, if it is any good, lets them write while offline. The design here assumes that most submissions are fine, a few are advertising, and a handful are actively hostile. The job is to handle all three without a moderation queue that never ends.

## The shape

A message is a name, a short body and a timestamp. The body is limited to 100 characters. On the way out, the client applies a light obfuscation: a character shift, then Base64, with a prefix. The server stores that string. The wall shows the obfuscated text until a reader chooses to reveal it.

This is obfuscation, not encryption. There is no key, and anyone who looks at the JavaScript can reverse it. The point is to stop a message being readable in a screenshot or a page source at a glance, and to make the wall feel like a wall of secrets. Calling it encryption would be a lie that someone might rely on. The privacy note says what it is.

The API is a POST with a JSON body, an origin check and a CSRF token. MongoDB is the only store. There are no accounts, no email addresses and no profiles.

## The abuse surface

The first layer is cheap and catches the obvious. The request must come from the site's own origin; a cross-site form post is rejected before the body is parsed. The body size is capped. The message length is capped again on the server, because a client-side `maxlength` is a suggestion. A hidden field that should stay empty catches bots that fill every input.

The second layer is rate limiting in MongoDB, not in memory. An in-memory counter resets with every cold serverless instance, which makes the limit decorative. The keys are an IP and an IP plus a route, the window is a minute, and there is a daily cap. A global budget catches a flood spread across many addresses.

The third layer is a spam score. It is deliberately not a classifier. Each signal adds points and a reason:

- A link adds two points, and each additional link adds one.
- Advertising phrases add three each.
- Mostly capitals add one.
- Six or more repeated characters add one.
- A link with four words or fewer adds two.
- A message that repeats the same words adds one.

At four points the message is stored hidden and sent to moderation. The wall does not reject it outright, because a false positive that vanishes is worse than one a human can release. The stored reasons are shown next to the entry in the admin queue, so the decision takes seconds.

## Moderation

The queue is a list of held entries with their score and reasons. Approve publishes; reject hides permanently. A repeated offender can be banned by hashed IP, with an expiry. Bans expire on their own, because a permanent ban for one bad afternoon is more administration than it prevents.

Every decision writes an audit row: what happened, to which entry, when, and a hashed, truncated IP. The hash is enough to correlate an afternoon of abuse and not enough to know where someone lives. The raw address is not stored in the audit log.

The admin routes are separate from the public ones and require a session. Their rate limit is tighter, and the session row expires on its own. The guestbook's public read path does not touch the admin code at all.

## The offline queue

The interesting failure is the message written on a train. The form submits optimistically: a temporary entry appears on the wall with a pending marker, and the payload goes into IndexedDB. A service worker replays it when the connection returns, even if the tab is closed, where Background Sync is available.

Two details make the replay safe. The record carries a client-generated id that the server stores under a unique index, so a retry after a dropped response returns the original entry instead of creating a second one. And the CSRF token is stashed next to the queue, because a service worker cannot read the page's memory or `localStorage`. Without the token, the replay would be rejected as a forgery.

The queue drains on the `online` event, on `visibilitychange`, and on the next page load. Background Sync is treated as a bonus, not a guarantee: Safari does not implement it, and iOS can evict the worker. The UI says "waiting to send", not "sent".

The hardest bug in this area was not the network. It was two tabs draining the same queue at once. A `navigator.locks` lock fixes it where supported; the server's idempotency key is the backstop everywhere else.

## Privacy

The site stores a hashed, truncated IP for rate limiting and moderation, not the address itself. The hash expires with the rate-limit bucket or the ban. There is no account, no email and no cookie for the guestbook. A message can be removed on request, and the privacy note explains what is kept and for how long.

The obfuscated body is still user content. It is escaped on render, parsed as Markdown-lite rather than HTML, and links are rendered with a safe `rel`. That removes a class of injection problems at the cost of a feature nobody asked for.

## What broke

The first spam wave was not sophisticated. It was links with three words around them, and the score held them. The first false positive was a real person quoting a URL with a short message; the reasons made that obvious in the queue, and the threshold stayed where it was.

The offline queue produced one duplicate in testing before the idempotency index existed. The fix was a unique index and a retry that treats a conflict as success. The second version has not duplicated a message.

The moderation queue is the real cost. It is small because the wall is small, and it would not stay small if the site were popular. That is a reasonable limit for a personal guestbook, and it is worth saying out loud rather than pretending the scoring solves it.
