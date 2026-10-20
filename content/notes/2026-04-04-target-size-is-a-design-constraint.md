---
title: Target size is a design constraint
date: 2026-04-04
tags: accessibility, wcag, design
series: Web platform notes
seriesOrder: 6
summary: WCAG 2.2 sets a 24-pixel floor for pointer targets, and the spacing exception is narrower than most teams assume.
---

Small controls are usually an aesthetic decision. A 16-pixel close icon looks tidy next to a 16-pixel title. The cost is paid by anyone with a tremor, a fat finger or a phone held one-handed. WCAG 2.2 made that cost measurable.

## The rule

Success Criterion 2.5.8, Target Size (Minimum), is Level AA. Pointer targets must be at least 24 by 24 CSS pixels, with five exceptions. The important ones are:

- **Spacing.** A 24-pixel diameter circle centred on the target must not intersect another target's circle. This is how a 16-pixel icon can still pass, as long as its neighbours are far enough away.
- **Equivalent.** A smaller control is allowed if the same action is available through a larger one on the same page.
- **Inline.** Links inside a sentence are exempt, because making every word in a paragraph 24 pixels tall would break the text.
- **User agent.** A control drawn by the browser, such as a native select arrow, is not yours to size.
- **Essential.** A target whose size is essential to the information, such as a map pin, can be smaller.

Level AAA asks for 44 by 44 under 2.5.5, and that is the better target for anything used often. Apple's guidance is 44 points, Material's is 48 density-independent pixels. The 24-pixel rule is a floor, not a goal.

## The spacing exception is not a loophole

The exception is often read as "small buttons are fine if there is a gap". The actual test is geometric: draw a 24-pixel circle around the centre of the target and check that it does not overlap the circle around any other target. A row of 16-pixel icon buttons with 4-pixel gaps fails, because the circles overlap even though the visible icons do not.

In practice, a 16-pixel icon needs about 8 pixels of clear space before its circle stops overlapping a neighbour's. That is close to the padding a comfortable button already has. The exception exists for inline links and for genuinely dense interfaces, not for a toolbar that could simply be taller.

The measurement is the target, not the icon. Padding and a transparent border count if they receive the pointer, so the visual can stay small while the hit area grows. The trap is two expanded areas overlapping invisibly.

## What it changes in a design

The controls that fail first are predictable: modal close buttons, pagination, tag chips, icon-only actions in table rows, social links in a footer, and the arrows on a carousel. On a phone, a 24-pixel control is already marginal; a 44-pixel row is easier to hit and easier to read.

Density is the real trade-off. An admin table with 32-pixel rows can pass if each action has enough space, but the row itself is still a small target. A 44-pixel row costs vertical space and buys fewer misclicks. For a public wall or a settings panel, that is usually the right trade.

The 320-pixel viewport is the stress test. At 320 CSS pixels, roughly a 400% zoom on a 1280-pixel screen, every horizontal arrangement is one bad decision away from a scrollbar. A row of five 24-pixel buttons plus gaps may fit; five 44-pixel buttons with text labels will not. The answer is wrapping or a menu, not shrinking below the floor.

## Testing it

Automated tools are inconsistent here. axe has a target-size rule, but it is experimental and cannot evaluate the spacing exception reliably. The dependable check is a small Playwright script: collect every visible interactive element, measure its bounding box, and assert the minimum. Then do the harder check: for each target under 24, compute the 24-pixel circle and look for intersections with another target's circle.

That script catches the invisible overlap that a screenshot review misses. It also needs a viewport sweep, because a control that is comfortable at 1440 pixels can be squeezed at 320. Run it at 320, 390, 768 and 1280, with the text-spacing override switched on, and with the pointer coarse where the browser supports it.

Keyboard focus is a separate test. A target can be large and still unreachable; tab order, visible focus and a name are not covered by 2.5.8.

## The Win95 problem

The Windows 95 desktop is the hardest case, because the entire visual language is built on 16-pixel controls. The title bar buttons are tiny by design. The fix is not to redraw them at 44 pixels; it is to keep the pixels and give each button a larger transparent hit area, then check that the areas do not overlap. The close button can look like 1995 and behave like 2026.

That is the useful way to think about the criterion. It is not asking for bigger icons. It is asking for a pointer target that a person can hit, which is a different measurement and often a cheaper fix.
