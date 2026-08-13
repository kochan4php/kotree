'use client';

import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';

// Easter eggs are event-driven (ACTIVATE_*). None of them render on load,
// so none of their JS (incl. three.js for DoomMode) ships in the initial
// bundle. The chunk is imported only when its trigger event fires.
// The components attach their own ACTIVATE_* listeners on mount, so we
// re-dispatch the event once the component has mounted (next frame).
const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  ACTIVATE_DOOM: () => import('@/components/doom'),
  ACTIVATE_BOSS_FIGHT: () => import('@/components/boss-fight'),
  ACTIVATE_MIRROR: () => import('./infinite-mirror'),
  ACTIVATE_WIN95: () => import('@/components/win95'),
};

export default function EasterEggLauncher() {
  const [mounted, setMounted] = useState<Record<string, ComponentType>>({});
  const mountedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const handlers = Object.entries(LOADERS).map(([event, load]) => {
      const handler = () => {
        load()
          .then((mod) => {
            setMounted((prev) => (prev[event] ? prev : { ...prev, [event]: mod.default }));
            // Re-fire only when the component was JUST mounted, so its own
            // listener catches the event. Without this guard every re-dispatch
            // schedules another re-dispatch -> exponential event loop.
            if (!mountedRef.current[event]) {
              mountedRef.current[event] = true;
              requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(event)));
            }
          })
          .catch((err) => console.error(`[easter-egg] failed to load ${event}:`, err));
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
