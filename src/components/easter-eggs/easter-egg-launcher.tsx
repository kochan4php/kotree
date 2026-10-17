'use client';

import { useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';

// Easter eggs are event-driven (ACTIVATE_*). None of them render on load,
// so none of their JS (incl. three.js for DoomMode) ships in the initial
// bundle. The chunk is imported only when its trigger event fires.
const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  ACTIVATE_DOOM: () => import('@/components/doom'),
  ACTIVATE_BOSS_FIGHT: () => import('@/components/boss-fight'),
  ACTIVATE_MIRROR: () => import('./infinite-mirror'),
  ACTIVATE_WIN95: () => import('@/components/win95'),
};

// Re-dispatches the activation event AFTER the lazy component has mounted.
// Child effects run before parent effects, so by the time this wrapper's
// effect fires, the component's own ACTIVATE_* listener is attached.
// (The previous rAF re-dispatch could fire before React committed under load,
// silently dropping the event — the source of a long-standing flaky egg.)
function ActivationDispatcher({ event, children }: { event: string; children: ReactNode }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(event));
  }, [event]);
  return <>{children}</>;
}

export default function EasterEggLauncher() {
  const [mounted, setMounted] = useState<Record<string, ComponentType>>({});

  useEffect(() => {
    const handlers = Object.entries(LOADERS).map(([event, load]) => {
      const handler = () => {
        load()
          .then((mod) => setMounted((prev) => (prev[event] ? prev : { ...prev, [event]: mod.default })))
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
        <ActivationDispatcher key={event} event={event}>
          <Component />
        </ActivationDispatcher>
      ))}
    </>
  );
}
