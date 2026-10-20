---
title: Case study: shipping a Win95 desktop
date: 2026-08-08
tags: case-study, accessibility, react
series: Building Kotree
seriesOrder: 4
summary: Four apps, one window manager and a scope list that kept the joke from becoming a second product.
---

The Windows 95 desktop began as a screenshot joke: grey chrome, a taskbar, a window that could be dragged. The risk with a joke is that it stays a screenshot. The version that shipped is a small window manager with four working apps, a keyboard model, a mobile layout and its own audit. The scope was the hard part.

## Scope

The desktop is not an operating system. It has no file system, no networking, no sound and no installable programs. It has a window manager, a Start menu, a taskbar, Notepad, Paint, Calculator and Minesweeper. Notepad persists a draft to `localStorage`; Paint exports a PNG; Calculator calculates; Minesweeper is playable and finished.

Everything else was cut on purpose. A file explorer would need a virtual file system and a permission model. A browser inside the desktop would need an iframe and a policy conversation. Clippy would need a personality. The four apps are enough to make the desktop feel inhabited, and each one is small enough to test.

The scope list was written before the code. That is the only reason the desktop shipped.

## Window state

One reducer owns the desktop: an array of windows, a z-index counter and the active id. Each window has an app key, position, size, z-index, minimised and maximised flags, and a `restoreRect`. Opening, closing, focusing, moving, resizing, minimising and maximising are actions. The reducer is pure, which makes the geometry testable without a browser.

Dragging is the exception to the state rule. A pointer move writes a CSS transform on the window element, and the final position is dispatched on pointer up. Dispatching every move would re-render the whole desktop at pointer frequency. The transform keeps the drag on the compositor and the React tree quiet.

Maximising stores the previous rectangle before filling the desktop. Restoring returns to it. Without that, a maximised window that is restored to a default size loses the arrangement the user made, which is a small betrayal that makes the whole thing feel fake.

## The keyboard model

The desktop is usable without a mouse, and the model is explained where it is used. The title bar is focusable with `tabIndex={0}`, labelled "Move Notepad, arrow keys, Shift to jump", and handles arrows at 16 pixels or 48 with Shift. The handler is on the title bar, so typing in Notepad does not move the window.

Closing a window returns focus to its taskbar button. The taskbar uses roving tabindex: one button is in the tab sequence, and the arrow keys move between the open windows. That keeps the tab order short and still exposes every window.

The apps have their own keys. Minesweeper uses arrows to move, Enter to dig and F to flag; right-click also flags. Calculator listens for digits, operators, Enter, Escape and Backspace while focused. The keys are printed in the window, because a shortcut nobody can find is not a feature.

The desktop does not intercept `Alt+Tab`, `Ctrl+W` or other browser and operating-system shortcuts. A page that fights the window manager it lives in is not more authentic; it is just broken. The shortcuts it does own are the ones a page can own.

## Focus and screen readers

Windows are non-modal dialogs, not a modal trap. Each has a label, a role and a focusable title bar. The taskbar is a toolbar with buttons. Opening a window moves focus into it; closing it restores focus to the opener. An `aria-live` region announces the window that opened or closed, so the change is not silent.

The desktop passes axe with zero serious or critical violations. That is not the same as being pleasant with a screen reader, so the keyboard journey is also tested end to end: open the desktop, open Notepad, type, minimise, restore, close, and return to the taskbar.

## Mobile and small screens

The desktop does not pretend a 320-pixel phone is a desktop. Windows become full-screen sheets, dragging is disabled, and the taskbar stays at the bottom with 44-pixel buttons. The apps reflow rather than scale: Notepad is a text area, Paint is a canvas with a toolbar that wraps, Calculator is a keypad, Minesweeper's grid fits.

The page still has to pass the same checks at 320 pixels: no horizontal scroll, no control under 24 pixels, and the text-spacing override does not break the layout. The Win95 chrome is small by design, so the hit areas are expanded with padding and checked for overlap.

## Bundle isolation

The desktop is not in the initial bundle. It is a dynamic import loaded when the secret opens. The four apps are components inside that chunk, so opening the desktop downloads all four, but the home page downloads none of them.

The CSS is scoped to the desktop container. The grey palette and the pixel borders do not leak into the rest of the site, and the site's theme tokens do not leak in. That isolation is what lets the desktop look wrong on purpose without making the rest of the page look wrong by accident.

## Testing

The reducer has unit tests for z-order, minimise and restore, and the geometry of snapping. The end-to-end suite covers the keyboard journey, the mobile layout, forced-colours mode, reduced motion and the axe audit. Visual baselines seed the random window placement, because a screenshot test that compares random positions fails for the wrong reason.

The drag test uses pointer events rather than mouse events, and it asserts the committed position after release, not the transform during the drag. That is the part a screenshot cannot check.

## What it taught

The desktop is the most elaborate easter egg on the site and the one most likely to be dismissed as decoration. Building it properly took longer than the joke deserved, and the result is better for it: a keyboard user can open Minesweeper and play, a phone user gets a usable layout, and the page it lives on does not pay for it until the secret is found.

The lesson is not that every joke needs this much work. It is that the scope list is the feature. Four apps and one window manager is a desktop. A fifth app would have been a second project.
