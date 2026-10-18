'use client';

import { useRef } from 'react';
import type React from 'react';

// M71: swipe-down-to-close for dialogs on touch screens. The gesture must
// START in the top band of the panel (the strip where a sheet's grab handle
// would sit), so scrolling a long list never dismisses anything by accident;
// a mostly-sideways drag is ignored for the same reason.
export function useSwipeDismiss(
  onClose: () => void,
  options: { band?: number; distance?: number } = {},
): { onTouchStart: (e: React.TouchEvent) => void; onTouchEnd: (e: React.TouchEvent) => void } {
  const band = options.band ?? 56;
  const distance = options.distance ?? 64;
  const start = useRef<{ x: number; y: number; at: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    start.current =
      touch.clientY - rect.top <= band ? { x: touch.clientX, y: touch.clientY, at: Date.now() } : null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = start.current;
    start.current = null;
    const touch = e.changedTouches[0];
    if (!from || !touch) return;
    const dy = touch.clientY - from.y;
    const dx = Math.abs(touch.clientX - from.x);
    if (dy > distance && dx < dy && Date.now() - from.at < 800) onClose();
  };

  return { onTouchStart, onTouchEnd };
}
