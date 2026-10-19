---
title: Accessibility as a test, not a promise
date: 2026-03-22
tags: a11y, testing, wcag
summary: Every page runs through axe in the suite, and the contrast tokens, reduced-motion rules and keyboard routes are checked like any other feature.
---

Sites tend to describe their accessibility the way they describe their values: a paragraph on a page, written once, quietly going stale. I did not want that paragraph here, so most of it is a test instead.

Every page — home, the notes, the guestbook, search, the error page, the admin — runs through axe in the end-to-end suite, in a browser, against the real build. Zero serious or critical violations, or the run fails. The same pages are audited again in dark mode with reduced motion at three widths, from a 390-pixel phone to a 1920-pixel desktop.

axe is only half of it. The suite also checks the things axe cannot see: every control is at least 24 by 24 pixels, no page scrolls sideways at 320 pixels (400% zoom) or 640, expanded line and letter spacing does not break the layout, forced-colors mode keeps real borders and visible focus, every page has one main landmark and one h1 with no skipped heading levels, and a full journey — skip link, command palette, typing a secret on the wall — is completed with the keyboard alone. The interactive corners get their own audit passes: the palette, the preferences panel, the terminal, the QR dialog and the Windows 95 desktop.

Contrast lives in the tokens rather than in good intentions. The bright accent colour is fine as a sticker and hopeless as text on cream, so there is a darker `--accent-ink` pair for every accent, which flips for dark and OLED, and the higher-contrast preference strengthens the muted pairs again.

Motion is a preference, not an assumption. The OS setting and the in-app switch both stop every animation, and a test asserts that nothing is left running on the home page, the stats page and Wrapped.

There is still a [written statement](/accessibility), and it tries to be honest about what is not covered. But it is the summary, not the argument. The argument runs on every push, in real browsers, on every page.
