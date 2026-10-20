---
title: Building Win95 in React
date: 2026-06-27
tags: react, win95, accessibility
series: Building Kotree
seriesOrder: 5
summary: A fake desktop is a window manager with a dress code; the hard parts are focus, keyboard movement and keeping the drag off the React render path.
---

A Windows 95 desktop in React is mostly a window manager with a dress code. The grey chrome is the memorable part, but the behaviour is what makes it feel real: windows that stack, minimise, restore, move and hand focus to each other without losing the plot.

## One reducer for the desktop

All window state lives in one reducer: an array of windows, a z-index counter and the id of the active window. Each window carries its app, position, size, z-index, minimised and maximised flags, and a `restoreRect` so maximising and restoring does not lose the previous geometry.

Dragging does not go through React state on every pointer move. The pointer down captures the pointer, the move writes a transform, and the final position is committed on pointer up. A dispatch per mouse event re-renders every window and makes the drag feel heavy, especially on a laptop trackpad.

Opening an app is a registry lookup, not a switch in the JSX. The registry holds the title, the icon, the initial size and a lazy component. Adding a fifth app should not require editing the window manager.

## Focus is the feature

The active window is the one with the highest z-index, and focusing a window brings it forward. That sounds trivial until the keyboard is involved. The title bar is focusable and labelled: "Move Notepad, arrow keys, Shift to jump". The label is the documentation; a keyboard feature nobody can find is not an accessibility feature.

The title bar handles arrow keys at 16 pixels, or 48 with Shift. The window does not move while a field inside it has focus, because the handler is on the title bar, not on the document. That distinction prevents the desktop from stealing keystrokes from Notepad.

Closing a window returns focus to the taskbar button that opened it, or to the next window in the stack. Losing focus to the body after closing a dialog is the most common keyboard bug in fake desktops, and it is easy to miss with a mouse.

## The keyboard model, honestly

The desktop does not try to own `Alt+Tab`. That belongs to the operating system, and a web page that intercepts it is a web page fighting the window manager it runs inside. Browser shortcuts such as `Ctrl+W` and `Ctrl+T` are also off limits. The shortcuts that remain are the ones a page can own without a fight: arrows to nudge, Enter to open, Escape to close a menu, and the app-specific keys.

Minesweeper is the best example. Arrows move the cursor, Enter digs, F plants a flag, and right-click does the same for people with a mouse. Calculator listens for digits, operators, Enter, Escape and Backspace while it has focus. Both are documented in the window, not in a help page nobody opens.

The taskbar uses roving tabindex: one button is in the tab order, and the arrow keys move between the others. That keeps the tab sequence short while still exposing every window. Without it, eight open windows means eight tab stops before the page content.

## Borders made of pixels

The chrome is drawn with two-pixel borders in four colours and a hard shadow. `border-style: outset` looks tempting, but the browser chooses the shades and they differ between engines. Explicit colours keep the look stable: white and light grey on the top-left, dark grey and black on the bottom-right, with a navy title bar.

The icons are small images rendered with `image-rendering: pixelated`, so they stay crisp when the desktop scales. The font stack prefers a bitmap-era face and falls back to Tahoma and Verdana, which have the right proportions even if the pixels are smoother. No web font is loaded for the joke.

The title bar buttons keep their 16-pixel look but get a larger hit area, because the accessibility floor still applies inside an easter egg. The visual joke and the pointer target are separate measurements.

## Keeping it off the first paint

The desktop is not part of the home page's critical path. It is loaded when someone opens the secret, in its own chunk; the apps are components inside that chunk. That keeps the window manager, the paint canvas and Minesweeper's game loop out of the initial bundle.

Inside the desktop, each window is memoised on its own props. Moving one window does not re-render the others. The drag uses a transform rather than `left` and `top`, so the compositor can handle it, and the desktop container gets `contain: layout paint` to stop the windows from affecting the rest of the page.

The result is a toy that does not tax the page it lives on. That is the whole trick: the costume is elaborate, but the machinery is small.
