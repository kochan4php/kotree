---
title: An offline guestbook
date: 2026-10-16
tags: pwa, offline, guestbook
summary: Offline messages queue on the device, Background Sync delivers them with the tab closed, and no-JavaScript visitors get a straight answer.
---

The [offline note](/notes/2026-10-12-offline-first) promised that anything you write without a connection sends itself later. The [guestbook](/guestbook) is where that promise actually had to hold, because it is the one corner of the site where you give something rather than just read it.

Writing offline queues the message on the device — a small list in IndexedDB, capped at twenty, because an offline streak should not grow a queue forever. The wall shows your entry immediately, marked as waiting, and the app icon carries a badge with the number still in the outbox. Optimism is fine as long as it is labelled.

Delivery has two routes, because a closed tab should not lose your message. If the tab is open when the connection returns, the page flushes the queue itself. If it is not, the service worker wakes on the Background Sync event and replays the queue: same storage, same requests. It needs the CSRF token the page stashed beside the queue, and if that token is older than ninety minutes it leaves the work for the page, which can mint a fresh one. Whoever reaches the queue first claims it by emptying it before sending, so the page and the worker cannot both claim the same message — a duplicate is worse than a delay.

When a late message lands, its id comes back with it, so a secret sent from a tunnel can still be edited in the window after it arrives, like any other.

The honest part is the no-JavaScript case. Messages are scrambled on your device before they are sent, and without JavaScript that cannot happen, so the guestbook does not pretend otherwise. It says, plainly, that it needs JavaScript, and points at the usual channels instead of showing a form that would never work. A test keeps that message in place.

This is the least visible work in the release, and probably the most useful: the message is never lost, never sent twice, and you are never lied to about either.
