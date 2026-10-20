---
title: Webmentions for one person
date: 2026-08-22
tags: indieweb, webmentions, privacy
series: Web platform notes
seriesOrder: 8
summary: Receiving webmentions is a small endpoint and a large moderation job; for a personal site, RSS may already cover the same ground.
---

A webmention is a simple idea: when a page links to yours, it sends a POST to an endpoint you advertise, and you can show that someone responded. The protocol is small. The operational part, verifying that the sender owns the page, deciding what to display and keeping the spam out, is where the time goes.

## Receiving

The endpoint accepts a form-encoded `source` and `target`. It returns 202 quickly and does the work later; a sender should not wait for a fetch and a parse. The target must be a URL on this site, and the source must be a URL that is not this site. A self-mention is not interesting and is an easy way to create a loop.

The discovery link goes in the document head: `<link rel="webmention" href="/api/webmention">`. A sender that supports the protocol finds it. A sender that does not can still be handled by hand, which is the realistic fallback for a site with a small audience.

## Verifying

The endpoint fetches the source and checks that it actually links to the target. That check is the whole security model. Without it, anyone can claim any mention. With it, the cost of spam rises to owning a page and publishing a link.

The fetch needs limits: HTTPS only, a timeout, a maximum body size, a redirect cap, and a block on private addresses. A webmention endpoint that fetches arbitrary URLs is an SSRF primitive, and a serverless function with access to a metadata service is a bad place to discover that. Resolve the host, reject loopback and link-local ranges, and do not follow redirects to them.

Parsing is microformats2 where available. An `h-entry` gives the author, the published date and the content. A plain page gives a title and a paragraph. Both are acceptable; the display should degrade to "mentioned this" rather than inventing metadata. The source's `<title>` is not automatically safe text, and the excerpt needs the same escaping as any other user content.

## Storage and display

One document per `(source, target)` pair, with a unique compound index. Re-sending the same mention updates the existing row rather than adding a duplicate; the protocol expects idempotence. Store the source, target, type, author name, author URL, excerpt, published date, received date and a status: pending, approved or rejected.

The default is pending. A mention appears on the site only after a human approves it. That is slower, and it is the right default for a site that does not want to publish someone else's words without looking. The public display can show a count and a short excerpt with a link to the source, which is enough.

The source is the canonical copy. If it disappears, the mention should disappear too; a periodic check for 404 or 410 is cheaper than storing a full copy and pretending it is permanent. Avatars should be proxied or omitted, because a remote image is a tracking pixel with good manners.

## Moderation and spam

The verification fetch removes the cheapest spam, but not all of it. A link farm can publish a page that links to everything and send a thousand mentions. Rate limits per source host and per IP, a cap on new mentions per day, and a blocklist of known bad hosts cover most of it.

The moderation queue shows the source URL, the excerpt and the time. Approve, reject or ban the host. Bans expire, like the guestbook's, because a permanent ban for a bad afternoon is more administration than it is worth. The audit log records the decision with a hashed IP, not the address.

Privacy is mostly about not collecting more than needed. The mention is public by definition, but the sender's IP is not. Hash it, truncate it, and let it expire. Do not store the full HTML of the source; store the fields you display.

## Why RSS may be enough

The uncomfortable question is whether any of this is necessary. For a personal site, the number of people who write about it and know what a webmention is may be zero. RSS already lets a reader follow the site; a manual "mentioned elsewhere" list costs five minutes and no endpoint.

A receiver makes sense when replies actually arrive, or when the site wants to join a conversation with other IndieWeb sites. Building it before that is a hobby, which is fine, as long as it is named as one. The endpoint is not the hard part; the moderation queue is. A feature that produces an empty queue for a year is a feature that could have been a paragraph.

If the goal is simply to know when someone links, a search engine alert or a weekly look at the referrer log is enough. Webmentions are worth building when the alternative, checking by hand, has actually become annoying.
