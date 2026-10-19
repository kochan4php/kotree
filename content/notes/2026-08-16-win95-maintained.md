---
title: Windows 95, maintained
date: 2026-08-16
tags: win95, ux, easter-eggs
summary: Notepad, Paint, Calculator and Minesweeper get the same care as everything else — snapping, keyboard nudging and real tests.
---

There is a Windows 95 desktop inside Kotree, listed among [the secrets](/secrets) as Time Machine. It exists because it is fun, and the temptation with fun is to leave it half-finished: a screenshot you can move around and nothing else. It got the same treatment as the rest of the site instead.

It is a real window manager. Drag, focus, stack, minimise, maximise, close. Four apps sit on it. Notepad writes its draft to localStorage, so it survives a reload — a reboot, in the joke's terms. Paint paints, and exports a PNG. Calculator calculates. Minesweeper is finished, and its controls are honest about the fact that not everyone uses a mouse: arrows move, Enter digs, F plants a flag, right-click flags too.

Small things make the difference between a toy and a thing that behaves. Windows snap when you release them near the screen edge or flush against another window, but only on release — while you drag, the window follows the pointer exactly, because a window that jumps mid-drag is worse than a crooked one. The title bar is focusable, and the arrow keys nudge the window sixteen pixels, with Shift jumping forty-eight; the label says so out loud, because a keyboard shortcut nobody can find is not an accessibility feature.

Then the unglamorous part. The desktop has its own axe audit and has to pass it. It reflows to 320 pixels without sideways scrolling. It survives forced-colors mode. It appears in the visual baselines with a seeded random number, because the window manager places windows randomly — charming in a browser, poison in a screenshot test.

None of this is load-bearing. But an easter egg that behaves badly stops being an easter egg and becomes a bug with a joke attached. This one earns its keep the day someone opens Minesweeper with a keyboard and it simply works.
