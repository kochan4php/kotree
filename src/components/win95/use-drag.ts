'use client';

import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { WindowState } from './types';

interface UseDragOptions {
  windows: WindowState[];
  setWindows: Dispatch<SetStateAction<WindowState[]>>;
  isActive: boolean;
  bringToFront: (id: string) => void;
}

export function useDrag({ setWindows, isActive, bringToFront }: UseDragOptions) {
  // Dragging state (refs: no re-render during drag)
  const draggingId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragPos = useRef({ x: 0, y: 0 });
  const windowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const setWindowRef = (id: string) => (el: HTMLDivElement | null) => {
    windowRefs.current[id] = el;
  };

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

      // Sync final position back to React state
      setWindows(prev => prev.map(w => (w.id === id ? { ...w, x: finalX, y: finalY } : w)));
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

  return { setWindowRef, handlePointerDown };
}
