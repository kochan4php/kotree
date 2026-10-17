---
title: Kotree
summary: The link-in-bio you are standing on — neobrutalist UI, an obfuscated guestbook, hidden easter eggs and an offline-first shell.
date: 2026-10-17
tags: next.js, typescript, pwa
links: Live|/, GitHub|https://github.com/kochan4php
---

This site is a project in its own right. It started as a plain list of links and slowly turned into a small playground where every idea gets a home: a guestbook full of obfuscated secrets, a handful of easter eggs, and an app shell that keeps working when the network does not.

## The constraints

- **No extra dependencies.** Every feature is built on web platform APIs, CSS and what Next.js already ships.
- **Neobrutalism, properly.** Thick ink borders, hard shadows, flat colours — and contrast that always clears WCAG AA.
- **Fast by default.** Heavy pieces (3D easter eggs, charts, modals) only load the moment they are needed.

## What is inside

- A guestbook with optimistic updates, offline queueing and background sync
- Nine discoverable secrets, tracked locally and listed on [/secrets](/secrets)
- Command palette, QR sharing, print-friendly changelog and per-page share cards
- A service worker that serves an offline fallback instead of the browser dinosaur

> Built with Next.js, TypeScript and a stubborn preference for doing things with the platform itself.
