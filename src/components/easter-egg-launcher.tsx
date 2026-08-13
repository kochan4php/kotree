'use client';

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

// Easter eggs are event-driven (ACTIVATE_*). None of them render on load,
// so none of their JS (incl. three.js for DoomMode) ships in the initial
// bundle. The chunk is imported only when its trigger event fires.
// The components attach their own ACTIVATE_* listeners on mount, so we
// re-dispatch the event once the component has mounted (next frame).
const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  ACTIVATE_DOOM: () => import('@/components/doom-mode'),
  ACTIVATE_BOSS_FIGHT: () => import('@/components/boss-fight'),
  ACTIVATE_MIRROR: () => import('@/components/infinite-mirror'),
  ACTIVATE_WIN95: () => import('@/components/win95-mode'),
};

export default function EasterEggLauncher() {
  const [mounted, setMounted] = useState<Record<string, ComponentType>>({});

  useEffect(() => {
    const handlers = Object.entries(LOADERS).map(([event, load]) => {
      const handler = () => {
        load().then((mod) => {
          setMounted((prev) => {
            if (prev[event]) return prev; // already mounted once
            return { ...prev, [event]: mod.default };
          });
          // Re-fire after the component mounted so its own listener catches it
          requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(event)));
        });
      };
      window.addEventListener(event, handler);
      return [event, handler] as const;
    });
    return () => handlers.forEach(([event, handler]) => window.removeEventListener(event, handler));
  }, []);

  return (
    <>
      {Object.entries(mounted).map(([event, Component]) => (
        <Component key={event} />
      ))}
    </>
  );
}
