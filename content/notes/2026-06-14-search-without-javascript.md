---
title: Search that works without JavaScript
date: 2026-06-14
tags: search, ssr, accessibility
summary: The server-rendered search page gives every result its own URL, and the command palette searches a build-time index of the content.
---

The command palette is a nice toy, but it is a toy behind JavaScript and a keyboard shortcut. Search should not be behind anything, so there is a second door at [the search page](/search): a plain GET form, a server that does the matching, and results that are ordinary links.

The page is rendered per request from the same notes and projects the palette knows about. The matching is fuzzy and forgiving — letters in order, so `plte` finds `palette` — but titles and tags outrank summaries, so a query that names a note finds that note first, however late the word appears in its prose. Results are capped at thirty, and every one is a link you can send to someone.

The palette has its own index. A small script walks the content folders at build time and writes every note and project — title, summary, tags, URL — into a JSON file the palette loads on first use. That is how it can look inside a note's summary without shipping the content to every visitor.

Two small honesty features. The search page is marked noindex, because it is a tool rather than content, and when nothing matches it says so plainly and suggests a single word, since the matcher looks for letters in order. It also points at the palette, which searches the rest of the site, not just the writing.

The suite treats it like any other page: axe audits it empty and full, the smoke test proves that a query for `offline` finds [the note about offline](/notes/2026-10-12-offline-first), and the whole thing works with scripting switched off, which is how it was designed.
