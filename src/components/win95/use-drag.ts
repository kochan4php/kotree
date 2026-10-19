'use client';

import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { WindowState } from './types';
import { rememberWindowPosition } from './win95-prefs';

interface UseDragOptions {
  windows: WindowState[];
  setWindows: Dispatch<SetStateAction<WindowState[]>>;
  isActive: boolean;
  bringToFront: (id: string) => void;
}

// Snapping: a window released within a dozen pixels of the desktop edge or of
// another window's edge clicks flush to it, the way a window manager behaves.
// Only the released position is snapped — while dragging, the window follows
// the pointer exactly. Kept outside the hook so nothing in the drag effect
// depends on a function that is recreated every render.
const SNAP_PX = 12;

function snapAxis(value: number, targets: number[]) {
  let best = value;
  let bestDistance = SNAP_PX;
  for (const target of targets) {
    const distance = Math.abs(value - target);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

function snapPosition(
  id: string,
  x: number,
  y: number,
  refs: { [key: string]: HTMLDivElement | null }
) {
  const rect = refs[id]?.getBoundingClientRect();
  if (!rect) return { x, y };

  const others = Object.entries(refs)
    .filter(([otherId, other]) => otherId !== id && other)
    .map(([, other]) => other!.getBoundingClientRect());

  const xTargets = [0, window.innerWidth - rect.width];
  const yTargets = [0];
  for (const other of others) {
    xTargets.push(other.left, other.right, other.right - rect.width);
    yTargets.push(other.top, other.bottom, other.bottom - rect.height);
  }
  return { x: snapAxis(x, xTargets), y: snapAxis(y, yTargets) };
}

export function useDrag({ setWindows, isActive, bringToFront }: UseDragOptions) {
  // Dragging state (refs: no re-render during drag)
  const draggingId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragPos = useRef({ x: 0, y: 0 });
  const windowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const refCallbacks = useRef<{ [key: string]: (el: HTMLDivElement | null) => void }>({});

  // One stable callback per window. A fresh function each render would make
  // React detach the ref (call it with null) and re-attach on every render, so
  // the element could be missing exactly when a drag ends and the snap reads it.
  const setWindowRef = (id: string) =>
    (refCallbacks.current[id] ??= (el) => {
      windowRefs.current[id] = el;
    });

  // Global pointer handlers while active (refs + stable setWindows only)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingId.current) return;

      const el = windowRefs.current[draggingId.current];
      if (el) {
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        // Mutate DOM directly to bypass React render cycle for 120fps smooth drag
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
        dragPos.current = { x: newX, y: newY };
      }
    };

    const handlePointerUp = () => {
      if (!draggingId.current) return;
      const id = draggingId.current;
      const finalX = dragPos.current.x;
      const finalY = dragPos.current.y;

      draggingId.current = null;

      // Restore transition now that the drag is over
      const el = windowRefs.current[id];
      if (el) el.style.transition = '';

      // Sync the released position back to React state, snapped flush to the
      // desktop or to a neighbouring window when it landed close enough. The
      // transition is back on, so it glides the last few pixels.
      const snapped = snapPosition(id, finalX, finalY, windowRefs.current);
      // G7: where it settled is where it is next time
      rememberWindowPosition(id, snapped.x, snapped.y);
      setWindows(prev => prev.map(w => (w.id === id ? { ...w, x: snapped.x, y: snapped.y } : w)));
    };

    if (isActive) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isActive, setWindows]);

  const handlePointerDown = (e: React.PointerEvent, id: string, w: WindowState) => {
    bringToFront(id);
    if (w.isMaximized) return;
    draggingId.current = id;
    dragOffset.current = { x: e.clientX - w.x, y: e.clientY - w.y };
    dragPos.current = { x: w.x, y: w.y };
    // Disable CSS transition while dragging
    const el = windowRefs.current[id];
    if (el) el.style.transition = 'none';
  };

  // WCAG 2.5.7: dragging must have a non-drag alternative — the focused title
  // bar nudges the window with the arrow keys (Shift jumps further).
  const nudge = (id: string, dx: number, dy: number) => {
    const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(0, max));
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id || w.isMaximized) return w;
        const next = {
          x: clamp(w.x + dx, window.innerWidth - 80),
          y: clamp(w.y + dy, window.innerHeight - 60),
        };
        rememberWindowPosition(id, next.x, next.y);
        return { ...w, ...next };
      })
    );
  };

  return { setWindowRef, handlePointerDown, nudge };
}
