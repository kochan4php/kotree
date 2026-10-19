---
title: Test the boring things
date: 2026-09-20
tags: testing, ops, backups
summary: The restore drill, the secret scanner, the visual baselines and the post-deploy smoke test — dull checks that only matter on the bad day.
---

The tests people write are the interesting ones: the feature works, the button clicks, the animation plays. The tests that save you are the dull ones, and they are the first to get skipped. This batch of work was mostly the dull ones.

The restore drill starts from a backup file and refuses to trust it. If a checksum file travels beside the backup, the drill verifies it first, and a corrupted or truncated artifact stops there with a loud message instead of restoring half a database. Then it restores into a scratch database, compares the guestbook count and the click total, and fails if they do not add up. It never touches the database the site uses, which is what makes it safe to run at any time.

The secret scanner is deliberately small: a short list of narrow patterns — private key blocks, provider tokens with known prefixes, credentials embedded in a connection string, assigned secrets — run over a diff rather than the whole repository. Narrow because a scanner that cries wolf gets ignored, and an ignored scanner is worse than none. In CI it runs before anything else, so no secrets reach the tree in the first place.

The visual baselines cover the home page, the changelog and the error page at five widths, plus the dark theme, the guestbook, a note, an ultrawide, a phone held sideways, and every overlay — the palette, the QR dialog, the terminal, the Windows 95 desktop, forced colors, reduced motion. They are deterministic by construction: preferences frozen, the clock fixed, APIs stubbed, animations disabled. And they run on Windows only, because fonts rasterise differently per operating system and a false difference is worse than none.

Finally, the smoke test. After a deploy it walks the real URL and checks what must be true: the pages answer, the feeds and sitemaps exist, the badges render, the search index loads, and the security headers are on the home page. If any of it is missing, the deploy is not done.

None of this catches anything on a good day. That is the point. It exists so that a bad day is a failed check instead of a broken site.
